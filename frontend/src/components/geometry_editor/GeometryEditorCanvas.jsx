import React, { useRef, useState, useCallback, useEffect } from 'react';
import useSpatialIndex from './useSpatialIndex';

export function GeometryEditorCanvas({
  model,
  selectedPlotIds,
  selectedRoadId,
  onSelectPlot,
  onSelectRoad,
  onClearSelection,
  onUpdatePlotPolygon,
  activeTool,
  findSnapPoint,
  snapEnabled,
  viewMode = 'BLUEPRINT',
  georef = null
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dragTarget, setDragTarget] = useState(null); // { plotId, vertexIndex, startPt }
  const [snapHighlight, setSnapHighlight] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const { queryViewportPlots } = useSpatialIndex(model?.plots || []);

  const boundary = model?.boundary || {};
  const bbox = boundary.boundingBox || [0, 0, 1200, 900];
  const viewboxStr = `${bbox[0]} ${bbox[1]} ${Math.max(bbox[2] - bbox[0], 1200)} ${Math.max(bbox[3] - bbox[1], 900)}`;

  const visiblePlots = queryViewportPlots(bbox);

  const getCanvasCoords = useCallback((e) => {
    if (!svgRef.current) return [0, 0];
    const svg = svgRef.current;
    let pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [cursorPt.x, cursorPt.y];
  }, []);

  const handleMouseDown = (e) => {
    if (viewMode === 'MAP') return; // Pan is handled by leaflet in Map mode
    if (e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && viewMode !== 'MAP') {
      setPanOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
      return;
    }

    if (dragTarget) {
      const rawPt = getCanvasCoords(e);
      const snap = findSnapPoint(rawPt, model, dragTarget.plotId);
      const finalPt = snap.snapped ? snap.point : rawPt;
      setSnapHighlight(snap.snapped ? snap : null);

      const targetPlot = (model.plots || []).find(p => (p.id || p.plotId) === dragTarget.plotId);
      if (targetPlot) {
        const poly = [...(targetPlot.polygon || targetPlot.geometry || [])];
        poly[dragTarget.vertexIndex] = [Math.round(finalPt[0]), Math.round(finalPt[1])];
        if (dragTarget.vertexIndex === 0 && poly.length > 3) {
          poly[poly.length - 1] = poly[0]; // Maintain closure
        } else if (dragTarget.vertexIndex === poly.length - 1 && poly.length > 3) {
          poly[0] = poly[poly.length - 1]; // Maintain closure if last point dragged
        }
        onUpdatePlotPolygon(dragTarget.plotId, poly, false);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (dragTarget) {
      const rawPt = getCanvasCoords(e);
      const snap = findSnapPoint(rawPt, model, dragTarget.plotId);
      const finalPt = snap.snapped ? snap.point : rawPt;
      const targetPlot = (model.plots || []).find(p => (p.id || p.plotId) === dragTarget.plotId);
      if (targetPlot) {
        const poly = [...(targetPlot.polygon || targetPlot.geometry || [])];
        poly[dragTarget.vertexIndex] = [Math.round(finalPt[0]), Math.round(finalPt[1])];
        if (dragTarget.vertexIndex === 0 && poly.length > 3) {
          poly[poly.length - 1] = poly[0];
        } else if (dragTarget.vertexIndex === poly.length - 1 && poly.length > 3) {
          poly[0] = poly[poly.length - 1];
        }
        onUpdatePlotPolygon(dragTarget.plotId, poly, true);
      }
    }
    setIsPanning(false);
    setDragTarget(null);
    setSnapHighlight(null);
  };

  const startVertexDrag = (plotId, vIdx, e) => {
    e.stopPropagation();
    setDragTarget({ plotId, vertexIndex: vIdx });
  };
  
  const layoutTransform = georef?.layoutTransform || { translateX: 0, translateY: 0, scale: 1, rotation: 0 };
  const cx = bbox[0] + (bbox[2] - bbox[0]) / 2;
  const cy = bbox[1] + (bbox[3] - bbox[1]) / 2;
  
  // In map mode, use georef transform. In blueprint mode, use pan/zoom state.
  const containerStyle = viewMode === 'MAP' ? {
    transform: `translate(${layoutTransform.translateX}px, ${layoutTransform.translateY}px) scale(${layoutTransform.scale}) rotate(${layoutTransform.rotation}deg)`,
    transformOrigin: `${cx}px ${cy}px`
  } : { 
    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})` 
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative w-full h-full overflow-hidden select-none ${viewMode === 'MAP' ? 'pointer-events-none' : 'bg-slate-950 cursor-crosshair'}`}
    >
      <svg
        ref={svgRef}
        viewBox={viewboxStr}
        className="w-full h-full pointer-events-none"
      >
        <g style={containerStyle} className="pointer-events-auto">
        {/* LAYER 1: BOUNDARY */}
        {boundary.boundaryPolygon && (
          <polygon
            points={boundary.boundaryPolygon.map(p => `${p[0]},${p[1]}`).join(' ')}
            className="fill-slate-900/60 stroke-blue-500 stroke-[3] stroke-linejoin-round"
          />
        )}

        {/* LAYER 2: ROADS */}
        {(model.roads || []).map((r) => {
          const rid = r.roadId || r.id;
          const rpoly = r.polygon || r.geometry || [];
          return (
            <polygon
              key={rid}
              points={rpoly.map(p => `${p[0]},${p[1]}`).join(' ')}
              onClick={(e) => { e.stopPropagation(); onSelectRoad(rid); }}
              className={`fill-slate-800 stroke-slate-600 stroke-[1.5] cursor-pointer hover:fill-slate-700 ${selectedRoadId === rid ? 'stroke-blue-400 stroke-[3]' : ''}`}
            />
          );
        })}

        {/* LAYER 3: PLOTS */}
        {visiblePlots.map((p) => {
          const pid = p.id || p.plotId;
          const poly = p.polygon || p.geometry || [];
          const isSelected = selectedPlotIds.includes(pid);
          const c = p.centroid || [0, 0];

          return (
            <g key={pid}>
              <polygon
                points={poly.map(pt => `${pt[0]},${pt[1]}`).join(' ')}
                onClick={(e) => { e.stopPropagation(); onSelectPlot(pid, e.shiftKey); }}
                className={`transition-all cursor-pointer ${
                  isSelected
                    ? 'fill-blue-500/80 stroke-sky-300 stroke-[3]'
                    : p.status === 'SOLD'
                    ? 'fill-rose-600/70 stroke-rose-800 stroke-[1.5]'
                    : p.status === 'RESERVED'
                    ? 'fill-amber-500/70 stroke-amber-700 stroke-[1.5]'
                    : 'fill-emerald-500/80 stroke-emerald-700 stroke-[1.5] hover:fill-emerald-400'
                }`}
              />
              <text x={c[0]} y={c[1] - 3} className="fill-white text-[12px] font-bold text-anchor-middle pointer-events-none">{p.plotNumber || 'P'}</text>
              <text x={c[0]} y={c[1] + 9} className="fill-slate-200 text-[9px] text-anchor-middle pointer-events-none">{Math.round(p.area || 0)} sqft</text>

              {/* VERTEX HANDLES FOR SELECTED PLOT */}
              {isSelected && poly.map((pt, vIdx) => {
                if (vIdx === poly.length - 1 && poly.length > 1 && pt[0] === poly[0][0] && pt[1] === poly[0][1]) {
                  return null;
                }
                return (
                  <circle
                    key={vIdx}
                    cx={pt[0]}
                  cy={pt[1]}
                  r={5}
                    onMouseDown={(e) => startVertexDrag(pid, vIdx, e)}
                    className="fill-sky-400 stroke-slate-900 stroke-[2] hover:r-7 cursor-grab active:cursor-grabbing"
                  />
                );
              })}
            </g>
          );
        })}

        {/* SNAPPING HIGHLIGHT OVERLAY */}
        {snapHighlight && (
          <circle cx={snapHighlight.point[0]} cy={snapHighlight.point[1]} r={8} className="fill-none stroke-emerald-400 stroke-[2] animate-ping pointer-events-none" />
        )}
        </g>
      </svg>
    </div>
  );
}

export default GeometryEditorCanvas;
