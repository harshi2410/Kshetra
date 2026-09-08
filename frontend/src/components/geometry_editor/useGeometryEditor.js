import { useState, useCallback, useRef } from 'react';

/**
 * Production Geometry Editor Custom Hook (TASK-057)
 * Manages active Universal Layout Model, selection state, tool mode, history stack (undo/redo),
 * real-time client topology validation, and mutation triggers.
 */
export function useGeometryEditor(initialModel) {
  const [model, setModel] = useState(initialModel || { boundary: {}, roads: [], plots: [], labels: [] });
  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [selectedRoadId, setSelectedRoadId] = useState(null);
  const [activeTool, setActiveTool] = useState('SELECT'); // SELECT, MOVE_PLOT, MOVE_VERTEX, ADD_VERTEX, SPLIT_PLOT, MERGE_PLOTS, ROTATE
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Undo / Redo History Stack
  const historyRef = useRef([initialModel]);
  const historyIndexRef = useRef(0);
  const [, setHistoryTick] = useState(0);

  const pushHistory = useCallback((newModel) => {
    const nextStack = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextStack.push(JSON.parse(JSON.stringify(newModel)));
    historyRef.current = nextStack;
    historyIndexRef.current = nextStack.length - 1;
    setHistoryTick(t => t + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevModel = historyRef.current[historyIndexRef.current];
      setModel(JSON.parse(JSON.stringify(prevModel)));
      setHistoryTick(t => t + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextModel = historyRef.current[historyIndexRef.current];
      setModel(JSON.parse(JSON.stringify(nextModel)));
      setHistoryTick(t => t + 1);
    }
  }, []);

  // Real-Time Client Validation
  const validateClientGeometry = useCallback(() => {
    const errors = [];
    const warnings = [];
    const plotNoSet = new Set();
    const plots = model.plots || [];

    plots.forEach((p) => {
      const pno = p.plotNumber;
      if (pno) {
        if (plotNoSet.has(pno)) errors.push(`Duplicate plot number '${pno}' detected.`);
        plotNoSet.add(pno);
      }
      const poly = p.polygon || p.geometry || [];
      if (poly.length < 3) errors.push(`Plot '${pno || p.id}' has less than 3 vertices.`);
    });

    return { isValid: errors.length === 0, errors, warnings };
  }, [model]);

  // Object Selection
  const selectPlot = useCallback((plotId, multi = false) => {
    setSelectedRoadId(null);
    if (multi) {
      setSelectedPlotIds(prev => prev.includes(plotId) ? prev.filter(id => id !== plotId) : [...prev, plotId]);
    } else {
      setSelectedPlotIds([plotId]);
    }
  }, []);

  const selectRoad = useCallback((roadId) => {
    setSelectedPlotIds([]);
    setSelectedRoadId(roadId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPlotIds([]);
    setSelectedRoadId(null);
  }, []);

  // Geometry Mutations
  const updatePlotPolygon = useCallback((plotId, newPolygon, isFinal = true) => {
    setModel(prev => {
      const updatedPlots = (prev.plots || []).map(p => {
        if (p.id === plotId || p.plotId === plotId) {
          let area = 0.0;
          let cx = 0.0, cy = 0.0;
          if (newPolygon.length >= 3) {
            // Shoelace Area & Polygon Centroid
            let a = 0;
            let cx_sum = 0, cy_sum = 0;
            for (let i = 0; i < newPolygon.length - 1; i++) {
              const pt1 = newPolygon[i];
              const pt2 = newPolygon[i+1];
              const cross = (pt1[0] * pt2[1] - pt2[0] * pt1[1]);
              a += cross;
              cx_sum += (pt1[0] + pt2[0]) * cross;
              cy_sum += (pt1[1] + pt2[1]) * cross;
            }
            // Add closure if not explicitly closed
            const last = newPolygon[newPolygon.length - 1];
            const first = newPolygon[0];
            if (last[0] !== first[0] || last[1] !== first[1]) {
              const cross = (last[0] * first[1] - first[0] * last[1]);
              a += cross;
              cx_sum += (last[0] + first[0]) * cross;
              cy_sum += (last[1] + first[1]) * cross;
            }
            
            a = a * 0.5;
            area = Math.abs(a);
            
            if (area > 0) {
              cx = cx_sum / (6 * a);
              cy = cy_sum / (6 * a);
            }
          }
          return { ...p, polygon: newPolygon, centroid: [Math.round(cx), Math.round(cy)], area: area || p.area };
        }
        return p;
      });
      const nextModel = { ...prev, plots: updatedPlots };
      if (isFinal) {
        pushHistory(nextModel);
      }
      return nextModel;
    });
  }, [pushHistory]);

  const updatePlotMetadata = useCallback((plotId, patchData) => {
    setModel(prev => {
      const updatedPlots = (prev.plots || []).map(p => {
        if (p.id === plotId || p.plotId === plotId) {
          return { ...p, ...patchData };
        }
        return p;
      });
      const nextModel = { ...prev, plots: updatedPlots };
      pushHistory(nextModel);
      return nextModel;
    });
  }, [pushHistory]);

  return {
    model, setModel,
    selectedPlotIds, selectPlot,
    selectedRoadId, selectRoad, clearSelection,
    activeTool, setActiveTool,
    snapEnabled, setSnapEnabled,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    undo, redo,
    validateClientGeometry,
    updatePlotPolygon, updatePlotMetadata
  };
}

export default useGeometryEditor;
