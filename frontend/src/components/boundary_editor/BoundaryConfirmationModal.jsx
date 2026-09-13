import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Move,
  PenTool,
  Check,
  X,
  Sparkles,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  ShieldCheck
} from 'lucide-react';
import projectService from '../../services/projectService';

export default function BoundaryConfirmationModal({
  isOpen,
  onClose,
  projectId,
  initialPolygon = null,
  imageUrl = null,
  onBoundaryConfirmed
}) {
  const [polygon, setPolygon] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState(null);
  const [activeTool, setActiveTool] = useState('MOVE'); // 'MOVE' | 'ADD' | 'DELETE' | 'DRAW'
  const [detecting, setDetecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [meta, setMeta] = useState({
    shapeType: 'DETECTING',
    vertexCount: 0,
    areaSqft: 0,
    perimeterFt: 0,
    confidence: 0.95,
    isConcave: false,
    concavityRatio: 1.0,
    statusMessage: ''
  });
  const [isLocked, setIsLocked] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Calculate polygon geometry properties on client
  const computePolygonMetrics = (pts) => {
    if (!pts || pts.length < 3) {
      return { area: 0, perimeter: 0, shapeType: 'INCOMPLETE' };
    }
    let area = 0;
    let perimeter = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      area += (p1[0] * p2[1]) - (p2[0] * p1[1]);
      perimeter += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    }
    area = Math.abs(area) / 2.0;

    let shapeType = 'IRREGULAR';
    if (n === 4) shapeType = 'TRAPEZOIDAL / 4-SIDED';
    else if (n === 6 || n === 7 || n === 8) shapeType = 'L-SHAPED / MULTI-WING';
    else if (n > 8) shapeType = 'IRREGULAR POLYGON';

    return {
      area: Math.round(area),
      perimeter: Math.round(perimeter),
      shapeType
    };
  };

  // Auto-detect boundary on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialPolygon && initialPolygon.length >= 3) {
      setPolygon(initialPolygon);
      setHistory([initialPolygon]);
      const metrics = computePolygonMetrics(initialPolygon);
      setMeta(prev => ({
        ...prev,
        shapeType: metrics.shapeType,
        vertexCount: initialPolygon.length,
        areaSqft: metrics.area,
        perimeterFt: metrics.perimeter,
        statusMessage: 'Loaded active project boundary.'
      }));
    } else {
      handleAutoDetect();
    }
  }, [isOpen, projectId]);

  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const res = await projectService.detectBoundary(projectId);
      if (res && res.polygon && res.polygon.length >= 3) {
        // Strip duplicate closing point if present
        let pts = res.polygon;
        if (pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
          pts = pts.slice(0, -1);
        }
        setPolygon(pts);
        setHistory([pts]);
        setMeta({
          shapeType: res.shapeType || 'IRREGULAR',
          vertexCount: pts.length,
          areaSqft: res.areaSqft || 0,
          perimeterFt: res.perimeterFt || 0,
          confidence: res.confidence || 0.95,
          isConcave: res.isConcave || false,
          concavityRatio: res.concavityRatio || 1.0,
          statusMessage: res.statusMessage || 'Detected authentic land boundary contour.'
        });
        fitPolygonToView(pts);
      }
    } catch (err) {
      console.error('Boundary detection error:', err);
    } finally {
      setDetecting(false);
    }
  };

  const fitPolygonToView = (pts) => {
    if (!pts || pts.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const polyW = Math.max(50, maxX - minX);
    const polyH = Math.max(50, maxY - minY);

    const pad = 80;
    const availW = Math.max(200, rect.width - pad);
    const availH = Math.max(200, rect.height - pad);

    const s = Math.min(availW / polyW, availH / polyH, 2.0);
    setScale(s);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setPan({
      x: rect.width / 2 - cx * s,
      y: rect.height / 2 - cy * s
    });
  };

  const pushHistory = (newPoly) => {
    setHistory(prev => [...prev.slice(-20), newPoly]);
    setPolygon(newPoly);
    const metrics = computePolygonMetrics(newPoly);
    setMeta(prev => ({
      ...prev,
      vertexCount: newPoly.length,
      areaSqft: metrics.area,
      perimeterFt: metrics.perimeter,
      shapeType: metrics.shapeType
    }));
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const nextHistory = history.slice(0, -1);
      const prevPoly = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setPolygon(prevPoly);
      const metrics = computePolygonMetrics(prevPoly);
      setMeta(prev => ({
        ...prev,
        vertexCount: prevPoly.length,
        areaSqft: metrics.area,
        perimeterFt: metrics.perimeter,
        shapeType: metrics.shapeType
      }));
    }
  };

  const handleReset = () => {
    if (history.length > 0) {
      const initial = history[0];
      setPolygon(initial);
      setHistory([initial]);
      fitPolygonToView(initial);
    }
  };

  // Convert screen coordinates to canvas world coordinates
  const screenToWorld = (clientX, clientY) => {
    if (!containerRef.current) return [0, 0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / scale;
    const y = (clientY - rect.top - pan.y) / scale;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };

  // Canvas Mouse Events
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Pan canvas
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0) return;
    const [wx, wy] = screenToWorld(e.clientX, e.clientY);

    // Check if clicked near a vertex
    const threshold = 14 / scale;
    const clickedIdx = polygon.findIndex(p => Math.hypot(p[0] - wx, p[1] - wy) <= threshold);

    if (activeTool === 'MOVE') {
      if (clickedIdx !== -1) {
        setIsDraggingVertex(true);
        setDraggedIndex(clickedIdx);
        setSelectedVertexIndex(clickedIdx);
      } else {
        // Clicked background -> pan
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }
    } else if (activeTool === 'DELETE') {
      if (clickedIdx !== -1 && polygon.length > 3) {
        const next = polygon.filter((_, i) => i !== clickedIdx);
        pushHistory(next);
        setSelectedVertexIndex(null);
      }
    } else if (activeTool === 'ADD') {
      // Find closest edge to insert vertex
      if (polygon.length >= 2) {
        let bestDist = Infinity;
        let insertAfter = -1;
        for (let i = 0; i < polygon.length; i++) {
          const p1 = polygon[i];
          const p2 = polygon[(i + 1) % polygon.length];
          // Distance from point to segment
          const l2 = (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2;
          let t = Math.max(0, Math.min(1, ((wx - p1[0]) * (p2[0] - p1[0]) + (wy - p1[1]) * (p2[1] - p1[1])) / l2));
          const projX = p1[0] + t * (p2[0] - p1[0]);
          const projY = p1[1] + t * (p2[1] - p1[1]);
          const d = Math.hypot(wx - projX, wy - projY);
          if (d < bestDist) {
            bestDist = d;
            insertAfter = i;
          }
        }
        if (bestDist < 40 / scale && insertAfter !== -1) {
          const next = [...polygon];
          next.splice(insertAfter + 1, 0, [wx, wy]);
          pushHistory(next);
          setSelectedVertexIndex(insertAfter + 1);
        } else {
          // Append vertex
          pushHistory([...polygon, [wx, wy]]);
        }
      } else {
        pushHistory([...polygon, [wx, wy]]);
      }
    } else if (activeTool === 'DRAW') {
      pushHistory([...polygon, [wx, wy]]);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (isDraggingVertex && draggedIndex !== null) {
      const [wx, wy] = screenToWorld(e.clientX, e.clientY);
      const next = [...polygon];
      next[draggedIndex] = [wx, wy];
      setPolygon(next);
      const metrics = computePolygonMetrics(next);
      setMeta(prev => ({
        ...prev,
        areaSqft: metrics.area,
        perimeterFt: metrics.perimeter
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDraggingVertex && draggedIndex !== null) {
      pushHistory(polygon);
      setIsDraggingVertex(false);
      setDraggedIndex(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    const newScale = Math.max(0.2, Math.min(6.0, scale * factor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPan({
        x: mouseX - (mouseX - pan.x) * (newScale / scale),
        y: mouseY - (mouseY - pan.y) * (newScale / scale)
      });
      setScale(newScale);
    }
  };

  const handleConfirmAndLock = async () => {
    if (polygon.length < 3) {
      alert('Boundary must have at least 3 vertices to enclose land.');
      return;
    }

    setConfirming(true);
    try {
      // Ensure closure
      const cleanPoly = [...polygon];
      if (cleanPoly[0][0] !== cleanPoly[cleanPoly.length - 1][0] || cleanPoly[0][1] !== cleanPoly[cleanPoly.length - 1][1]) {
        cleanPoly.push(cleanPoly[0]);
      }

      const res = await projectService.confirmBoundary(projectId, {
        polygon: cleanPoly
      });

      if (res && res.status === 'LOCKED') {
        setIsLocked(true);
        if (onBoundaryConfirmed) {
          onBoundaryConfirmed(res);
        }
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        alert(res?.message || 'Failed to confirm land boundary.');
      }
    } catch (err) {
      alert(`Confirmation error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  const pointsSvgStr = polygon.map(p => `${p[0]},${p[1]}`).join(' ');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#0a101d',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1200px',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85)'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1e293b',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldCheck style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  LAND BOUNDARY VERIFICATION & LOCK (SECTION 26–34)
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isLocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: isLocked ? '#34d399' : '#60a5fa',
                  border: `1px solid ${isLocked ? '#10b981' : '#3b82f6'}`
                }}>
                  {isLocked ? 'BOUNDARY LOCKED' : 'CONFIRMATION REQUIRED'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                The outer boundary is a hard geometric constraint. Layout alternatives will strictly preserve this exact polygon.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Toolbar & Status Strip */}
        <div style={{
          padding: '10px 24px',
          background: '#090e17',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Editor Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActiveTool('MOVE')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                border: activeTool === 'MOVE' ? '1px solid #3b82f6' : '1px solid #334155',
                background: activeTool === 'MOVE' ? '#1e3a8a' : '#1e293b',
                color: activeTool === 'MOVE' ? '#93c5fd' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Drag and reposition polygon vertices"
            >
              <Move style={{ width: '14px', height: '14px' }} /> Move Vertex
            </button>

            <button
              onClick={() => setActiveTool('ADD')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                border: activeTool === 'ADD' ? '1px solid #3b82f6' : '1px solid #334155',
                background: activeTool === 'ADD' ? '#1e3a8a' : '#1e293b',
                color: activeTool === 'ADD' ? '#93c5fd' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Click on edge to insert new vertex"
            >
              <Plus style={{ width: '14px', height: '14px' }} /> Add Point
            </button>

            <button
              onClick={() => setActiveTool('DELETE')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                border: activeTool === 'DELETE' ? '1px solid #ef4444' : '1px solid #334155',
                background: activeTool === 'DELETE' ? '#7f1d1d' : '#1e293b',
                color: activeTool === 'DELETE' ? '#fca5a5' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Click a vertex node to remove it"
            >
              <Trash2 style={{ width: '14px', height: '14px' }} /> Delete Point
            </button>

            <button
              onClick={() => setActiveTool('DRAW')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                border: activeTool === 'DRAW' ? '1px solid #10b981' : '1px solid #334155',
                background: activeTool === 'DRAW' ? '#064e3b' : '#1e293b',
                color: activeTool === 'DRAW' ? '#6ee7b7' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Click freely to construct polygon"
            >
              <PenTool style={{ width: '14px', height: '14px' }} /> Draw Boundary
            </button>

            <div style={{ width: '1px', height: '22px', background: '#334155', margin: '0 4px' }} />

            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600,
                border: '1px solid #334155', background: '#1e293b', color: history.length > 1 ? '#cbd5e1' : '#64748b',
                cursor: history.length > 1 ? 'pointer' : 'not-allowed'
              }}
            >
              <RotateCcw style={{ width: '13px', height: '13px' }} /> Undo
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: '7px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600,
                border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>

            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700,
                border: '1px solid #3b82f6', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
                cursor: detecting ? 'wait' : 'pointer'
              }}
            >
              <Sparkles style={{ width: '14px', height: '14px' }} /> {detecting ? 'Detecting...' : 'Auto-Detect'}
            </button>
          </div>

          {/* View controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => fitPolygonToView(polygon)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem',
                border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <Maximize2 style={{ width: '12px', height: '12px' }} /> Fit View
            </button>
            <button
              onClick={() => setScale(s => Math.min(s * 1.2, 5.0))}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155',
                background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <ZoomIn style={{ width: '13px', height: '13px' }} />
            </button>
            <button
              onClick={() => setScale(s => Math.max(s / 1.2, 0.2))}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155',
                background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <ZoomOut style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        </div>

        {/* Center Workspace (Canvas + Inspector) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Interactive Canvas Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            style={{
              flex: 1,
              background: '#070c16',
              position: 'relative',
              overflow: 'hidden',
              cursor: activeTool === 'MOVE' ? (isDraggingVertex ? 'grabbing' : 'grab') : 'crosshair'
            }}
          >
            {/* Background Grid */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Polygon Render via SVG */}
            <svg
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible'
              }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                {/* Optional Background Image / Blueprint */}
                {imageUrl && (
                  <image
                    href={imageUrl}
                    x="0"
                    y="0"
                    opacity="0.55"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Land Polygon Filled Interior */}
                {polygon.length >= 3 && (
                  <polygon
                    points={pointsSvgStr}
                    fill="rgba(37, 99, 235, 0.12)"
                    stroke="none"
                  />
                )}

                {/* Master Outer Boundary Line (Dual Stroke for contrast) */}
                {polygon.length >= 2 && (
                  <>
                    <polyline
                      points={`${pointsSvgStr} ${polygon.length > 2 ? `${polygon[0][0]},${polygon[0][1]}` : ''}`}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={4 / scale}
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={`${pointsSvgStr} ${polygon.length > 2 ? `${polygon[0][0]},${polygon[0][1]}` : ''}`}
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth={1.8 / scale}
                      strokeDasharray={`${6 / scale},${4 / scale}`}
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Vertex Handles */}
                {polygon.map((pt, idx) => {
                  const isSelected = selectedVertexIndex === idx;
                  return (
                    <g key={idx}>
                      <circle
                        cx={pt[0]}
                        cy={pt[1]}
                        r={8 / scale}
                        fill={isSelected ? '#38bdf8' : '#2563eb'}
                        stroke="#ffffff"
                        strokeWidth={2 / scale}
                        style={{ cursor: 'pointer' }}
                      />
                      <text
                        x={pt[0] + (10 / scale)}
                        y={pt[1] - (10 / scale)}
                        fill="#94a3b8"
                        fontSize={11 / scale}
                        fontWeight="700"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        P{idx + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Canvas Overlay Legend */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #1e293b',
              fontSize: '0.72rem',
              color: '#94a3b8',
              display: 'flex',
              gap: '16px'
            }}>
              <span>• Scroll to Zoom ({Math.round(scale * 100)}%)</span>
              <span>• Alt+Click / Middle-Click to Pan</span>
              <span>• Tool: <strong>{activeTool}</strong></span>
            </div>
          </div>

          {/* Right Geometric Analysis & Confirmation Panel */}
          <div style={{
            width: '340px',
            background: '#090e17',
            borderLeft: '1px solid #1e293b',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto'
          }}>
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px 0' }}>
                GEOMETRIC CHARACTERISTICS
              </h3>

              <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Shape Geometry:</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800, color: '#60a5fa',
                    background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '6px'
                  }}>
                    {meta.shapeType}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Enclosed Area:</span>
                  <strong style={{ fontSize: '0.82rem', color: '#f8fafc' }}>
                    {meta.areaSqft.toLocaleString()} sq.ft ({(meta.areaSqft / 43560).toFixed(2)} acres)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Perimeter:</span>
                  <strong style={{ fontSize: '0.82rem', color: '#f8fafc' }}>
                    {meta.perimeterFt.toLocaleString()} ft
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Boundary Vertices:</span>
                  <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
                    {polygon.length} Points
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Detection Confidence:</span>
                  <strong style={{ fontSize: '0.82rem', color: '#34d399' }}>
                    {Math.round(meta.confidence * 100)}%
                  </strong>
                </div>
              </div>

              {/* Strict Notice */}
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px' }}>
                  <AlertTriangle style={{ width: '16px', height: '16px' }} />
                  HARD GEOMETRIC LOCK
                </div>
                <p style={{ margin: 0, fontSize: '0.73rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Once locked, this outer contour cannot be straightened or converted into a square. All roads, plots, and parks will strictly generate inside this shape.
                </p>
              </div>

              {/* Vertex Coordinates List */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  Polygon Coordinate Nodes:
                </div>
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  background: '#030712',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.70rem',
                  fontFamily: 'monospace',
                  color: '#94a3b8'
                }}>
                  {polygon.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span style={{ color: '#60a5fa' }}>P{i + 1}:</span>
                      <span>({p[0]}, {p[1]})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div>
              <button
                onClick={handleConfirmAndLock}
                disabled={confirming || polygon.length < 3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isLocked ? '#10b981' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: confirming || polygon.length < 3 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
                }}
              >
                {confirming ? (
                  <span>Locking Geometry...</span>
                ) : isLocked ? (
                  <>
                    <CheckCircle2 style={{ width: '18px', height: '18px' }} /> Boundary Confirmed & Locked
                  </>
                ) : (
                  <>
                    <Lock style={{ width: '18px', height: '18px' }} /> Confirm & Lock Boundary
                  </>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.71rem', color: '#64748b', margin: '8px 0 0 0' }}>
                Required before generating UDCPR plot layouts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
