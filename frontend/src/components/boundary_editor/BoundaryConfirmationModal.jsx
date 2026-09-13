import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck,
  Sliders,
  ChevronDown,
  ChevronUp,
  Settings2,
  Cpu
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
  const [isLocked, setIsLocked] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('CANVAS'); // 'CANVAS' | 'PARAMS' | 'COORDS'

  // Detection Tuning Parameters
  const [showTuning, setShowTuning] = useState(false);
  const [detectionMode, setDetectionMode] = useState('AUTO'); // 'AUTO' | 'WHITE_PAGE_DRAWING' | 'SATELLITE_AERIAL' | 'CAD_TECHNICAL' | 'MANUAL'
  const [epsilonRatio, setEpsilonRatio] = useState(0.012);
  const [minAreaRatio, setMinAreaRatio] = useState(0.04);
  const [sensitivity, setSensitivity] = useState(50);

  // Manual Node Edit state
  const [manualX, setManualX] = useState('');
  const [manualY, setManualY] = useState('');

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

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef(null);

  // Calculate polygon geometry properties on client
  const computePolygonMetrics = useCallback((pts) => {
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
  }, []);

  const fitPolygonToView = useCallback((pts) => {
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

    const pad = Math.min(80, rect.width * 0.15);
    const availW = Math.max(150, rect.width - pad);
    const availH = Math.max(150, rect.height - pad);

    const s = Math.min(availW / polyW, availH / polyH, 2.0);
    setScale(s);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setPan({
      x: rect.width / 2 - cx * s,
      y: rect.height / 2 - cy * s
    });
  }, []);

  const handleAutoDetect = useCallback(async (customParams = null) => {
    setDetecting(true);
    try {
      const params = customParams || {
        detectionMode,
        epsilonRatio,
        minAreaRatio,
        sensitivity
      };
      const res = await projectService.detectBoundary(projectId, params);
      const boundaryPoints = res?.polygon || res?.detectedBoundary || res?.polygonVertices;
      if (boundaryPoints && Array.isArray(boundaryPoints) && boundaryPoints.length >= 3) {
        let pts = boundaryPoints;
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
        setTimeout(() => fitPolygonToView(pts), 50);
      }
    } catch (err) {
      console.error('Boundary detection error:', err);
    } finally {
      setDetecting(false);
    }
  }, [projectId, detectionMode, epsilonRatio, minAreaRatio, sensitivity, fitPolygonToView]);

  // Auto-detect boundary on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialPolygon && initialPolygon.length >= 3) {
      let pts = initialPolygon;
      if (pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
        pts = pts.slice(0, -1);
      }
      setPolygon(pts);
      setHistory([pts]);
      const metrics = computePolygonMetrics(pts);
      setMeta(prev => ({
        ...prev,
        shapeType: metrics.shapeType,
        vertexCount: pts.length,
        areaSqft: metrics.area,
        perimeterFt: metrics.perimeter,
        statusMessage: 'Loaded active project boundary.'
      }));
      setTimeout(() => fitPolygonToView(pts), 50);
    } else {
      handleAutoDetect();
    }
  }, [isOpen, projectId, initialPolygon, computePolygonMetrics, fitPolygonToView, handleAutoDetect]);

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

  // Manual vertex coordinate update
  const handleUpdateSelectedVertex = () => {
    if (selectedVertexIndex === null || isNaN(Number(manualX)) || isNaN(Number(manualY))) return;
    const next = [...polygon];
    next[selectedVertexIndex] = [Number(manualX), Number(manualY)];
    pushHistory(next);
  };

  // Canvas Mouse & Touch Events
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0) return;
    const [wx, wy] = screenToWorld(e.clientX, e.clientY);

    const threshold = 18 / scale;
    const clickedIdx = polygon.findIndex(p => Math.hypot(p[0] - wx, p[1] - wy) <= threshold);

    if (activeTool === 'MOVE') {
      if (clickedIdx !== -1) {
        setIsDraggingVertex(true);
        setDraggedIndex(clickedIdx);
        setSelectedVertexIndex(clickedIdx);
        setManualX(polygon[clickedIdx][0]);
        setManualY(polygon[clickedIdx][1]);
      } else {
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
      if (polygon.length >= 2) {
        let bestDist = Infinity;
        let insertAfter = -1;
        for (let i = 0; i < polygon.length; i++) {
          const p1 = polygon[i];
          const p2 = polygon[(i + 1) % polygon.length];
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
        if (bestDist < 45 / scale && insertAfter !== -1) {
          const next = [...polygon];
          next.splice(insertAfter + 1, 0, [wx, wy]);
          pushHistory(next);
          setSelectedVertexIndex(insertAfter + 1);
        } else {
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
      setManualX(wx);
      setManualY(wy);
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

  // Touch Support for Mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const [wx, wy] = screenToWorld(touch.clientX, touch.clientY);
      const threshold = 26 / scale;
      const clickedIdx = polygon.findIndex(p => Math.hypot(p[0] - wx, p[1] - wy) <= threshold);

      if (activeTool === 'MOVE' && clickedIdx !== -1) {
        setIsDraggingVertex(true);
        setDraggedIndex(clickedIdx);
        setSelectedVertexIndex(clickedIdx);
        setManualX(polygon[clickedIdx][0]);
        setManualY(polygon[clickedIdx][1]);
      } else {
        setIsPanning(true);
        panStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isPanning) {
        setPan({
          x: touch.clientX - panStartRef.current.x,
          y: touch.clientY - panStartRef.current.y
        });
      } else if (isDraggingVertex && draggedIndex !== null) {
        const [wx, wy] = screenToWorld(touch.clientX, touch.clientY);
        const next = [...polygon];
        next[draggedIndex] = [wx, wy];
        setPolygon(next);
        setManualX(wx);
        setManualY(wy);
      }
    } else if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = currentDist / touchStartRef.current;
      setScale(s => Math.max(0.2, Math.min(6.0, s * factor)));
      touchStartRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingVertex && draggedIndex !== null) {
      pushHistory(polygon);
      setIsDraggingVertex(false);
      setDraggedIndex(null);
    }
    setIsPanning(false);
    touchStartRef.current = null;
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
      const cleanPoly = [...polygon];
      if (cleanPoly[0][0] !== cleanPoly[cleanPoly.length - 1][0] || cleanPoly[0][1] !== cleanPoly[cleanPoly.length - 1][1]) {
        cleanPoly.push(cleanPoly[0]);
      }

      // 1. Confirm and Lock Boundary
      const res = await projectService.confirmBoundary(projectId, {
        polygonVertices: cleanPoly,
        polygon: cleanPoly
      });

      if (res && (res.isLocked || res.status === 'LOCKED' || res.isConfirmed)) {
        setIsLocked(true);

        // 2. Automatically generate 2D layout inside locked polygon
        try {
          const xs = cleanPoly.map(p => p[0]);
          const ys = cleanPoly.map(p => p[1]);
          const lenFt = Math.max(50, Math.max(...xs) - Math.min(...xs));
          const brdFt = Math.max(50, Math.max(...ys) - Math.min(...ys));

          await projectService.generateLayouts(projectId, {
            lengthFt: lenFt,
            breadthFt: brdFt,
            polygonVertices: cleanPoly
          });
        } catch (genErr) {
          console.warn('Auto-layout generation warning:', genErr);
        }

        if (onBoundaryConfirmed) {
          onBoundaryConfirmed(res);
        }
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        alert(res?.message || res?.detail || 'Failed to confirm land boundary. Please verify vertices form an enclosed loop.');
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
      background: 'rgba(5, 10, 20, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#0a101d',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1280px',
        height: '94vh',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85)'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #1e293b',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0
            }}>
              <ShieldCheck style={{ width: '20px', height: '20px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '0.01em' }}>
                  LAND BOUNDARY VERIFICATION & LOCK
                </h2>
                <span style={{
                  fontSize: '0.68rem',
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
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                The outer boundary is a hard geometric constraint. 2D layouts will generate strictly inside this shape.
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
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Mobile View Tab Switcher (Visible on mobile/tablet) */}
        <div className="boundary-mobile-tabs" style={{
          display: 'none',
          background: '#070c16',
          borderBottom: '1px solid #1e293b',
          padding: '6px 12px',
          gap: '6px'
        }}>
          <button
            onClick={() => setActiveMobileTab('CANVAS')}
            style={{
              flex: 1, padding: '7px 4px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px',
              border: activeMobileTab === 'CANVAS' ? '1px solid #3b82f6' : '1px solid #1e293b',
              background: activeMobileTab === 'CANVAS' ? '#1e3a8a' : '#0f172a',
              color: activeMobileTab === 'CANVAS' ? '#93c5fd' : '#94a3b8'
            }}
          >
            Canvas & Draw
          </button>
          <button
            onClick={() => setActiveMobileTab('PARAMS')}
            style={{
              flex: 1, padding: '7px 4px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px',
              border: activeMobileTab === 'PARAMS' ? '1px solid #3b82f6' : '1px solid #1e293b',
              background: activeMobileTab === 'PARAMS' ? '#1e3a8a' : '#0f172a',
              color: activeMobileTab === 'PARAMS' ? '#93c5fd' : '#94a3b8'
            }}
          >
            Tuning & Specs
          </button>
          <button
            onClick={() => setActiveMobileTab('COORDS')}
            style={{
              flex: 1, padding: '7px 4px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px',
              border: activeMobileTab === 'COORDS' ? '1px solid #3b82f6' : '1px solid #1e293b',
              background: activeMobileTab === 'COORDS' ? '#1e3a8a' : '#0f172a',
              color: activeMobileTab === 'COORDS' ? '#93c5fd' : '#94a3b8'
            }}
          >
            Points ({polygon.length})
          </button>
        </div>

        {/* Toolbar & Status Strip */}
        <div style={{
          padding: '8px 16px',
          background: '#090e17',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Editor Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTool('MOVE')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                border: activeTool === 'MOVE' ? '1px solid #3b82f6' : '1px solid #334155',
                background: activeTool === 'MOVE' ? '#1e3a8a' : '#1e293b',
                color: activeTool === 'MOVE' ? '#93c5fd' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Drag and reposition polygon vertices"
            >
              <Move style={{ width: '13px', height: '13px' }} /> Move
            </button>

            <button
              onClick={() => setActiveTool('ADD')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                border: activeTool === 'ADD' ? '1px solid #3b82f6' : '1px solid #334155',
                background: activeTool === 'ADD' ? '#1e3a8a' : '#1e293b',
                color: activeTool === 'ADD' ? '#93c5fd' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Click on edge to insert new vertex"
            >
              <Plus style={{ width: '13px', height: '13px' }} /> Add Point
            </button>

            <button
              onClick={() => setActiveTool('DELETE')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                border: activeTool === 'DELETE' ? '1px solid #ef4444' : '1px solid #334155',
                background: activeTool === 'DELETE' ? '#7f1d1d' : '#1e293b',
                color: activeTool === 'DELETE' ? '#fca5a5' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Click a vertex node to remove it"
            >
              <Trash2 style={{ width: '13px', height: '13px' }} /> Delete
            </button>

            <button
              onClick={() => setActiveTool('DRAW')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                border: activeTool === 'DRAW' ? '1px solid #10b981' : '1px solid #334155',
                background: activeTool === 'DRAW' ? '#064e3b' : '#1e293b',
                color: activeTool === 'DRAW' ? '#6ee7b7' : '#cbd5e1',
                cursor: 'pointer'
              }}
              title="Click freely to construct polygon"
            >
              <PenTool style={{ width: '13px', height: '13px' }} /> Draw
            </button>

            <div style={{ width: '1px', height: '20px', background: '#334155', margin: '0 2px' }} />

            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid #334155', background: '#1e293b', color: history.length > 1 ? '#cbd5e1' : '#64748b',
                cursor: history.length > 1 ? 'pointer' : 'not-allowed'
              }}
            >
              <RotateCcw style={{ width: '12px', height: '12px' }} /> Undo
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: '6px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              Reset
            </button>

            <button
              onClick={() => handleAutoDetect()}
              disabled={detecting}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                border: '1px solid #3b82f6', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
                cursor: detecting ? 'wait' : 'pointer'
              }}
            >
              <Sparkles style={{ width: '13px', height: '13px' }} /> {detecting ? 'Detecting...' : 'Auto-Detect'}
            </button>

            <button
              onClick={() => setShowTuning(!showTuning)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                border: showTuning ? '1px solid #38bdf8' : '1px solid #334155',
                background: showTuning ? '#075985' : '#1e293b',
                color: showTuning ? '#bae6fd' : '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              <Sliders style={{ width: '13px', height: '13px' }} />
              <span>Tuning</span>
              {showTuning ? <ChevronUp style={{ width: '12px', height: '12px' }} /> : <ChevronDown style={{ width: '12px', height: '12px' }} />}
            </button>
          </div>

          {/* View controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              onClick={() => fitPolygonToView(polygon)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem',
                border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <Maximize2 style={{ width: '12px', height: '12px' }} /> Fit
            </button>
            <button
              onClick={() => setScale(s => Math.min(s * 1.25, 5.0))}
              style={{
                padding: '5px 8px', borderRadius: '6px', border: '1px solid #334155',
                background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <ZoomIn style={{ width: '13px', height: '13px' }} />
            </button>
            <button
              onClick={() => setScale(s => Math.max(s / 1.25, 0.2))}
              style={{
                padding: '5px 8px', borderRadius: '6px', border: '1px solid #334155',
                background: '#1e293b', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <ZoomOut style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        </div>

        {/* Optional Detection Parameters Tuning Dropdown / Bar */}
        {showTuning && (
          <div style={{
            background: '#081120',
            borderBottom: '1px solid #1e3a8a',
            padding: '12px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            alignItems: 'center'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>
                DETECTION MODE
              </label>
              <select
                value={detectionMode}
                onChange={e => setDetectionMode(e.target.value)}
                style={{
                  width: '100%', height: '30px', background: '#0f172a', border: '1px solid #334155',
                  borderRadius: '6px', color: '#f8fafc', fontSize: '0.75rem', padding: '0 8px'
                }}
              >
                <option value="AUTO">Auto Detect (All Document Types)</option>
                <option value="WHITE_PAGE_DRAWING">2D White Page Drawing (Pen/Pencil)</option>
                <option value="SATELLITE_AERIAL">Satellite / Aerial Image (Color boundary)</option>
                <option value="CAD_TECHNICAL">CAD / Blueprint Plan (Outer boundary)</option>
                <option value="MANUAL">Manual Polygon Nodes</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>
                <span>CORNER SIMPLIFICATION (EPSILON)</span>
                <span>{(epsilonRatio * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.035"
                step="0.002"
                value={epsilonRatio}
                onChange={e => setEpsilonRatio(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>
                <span>DETECTION SENSITIVITY</span>
                <span>{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={sensitivity}
                onChange={e => setSensitivity(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => handleAutoDetect()}
                disabled={detecting}
                style={{
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: '#fff',
                  cursor: detecting ? 'wait' : 'pointer', width: '100%'
                }}
              >
                {detecting ? 'Re-detecting...' : 'Apply & Re-detect'}
              </button>
            </div>
          </div>
        )}

        {/* Center Workspace (Canvas + Inspector) */}
        <div className="boundary-workspace" style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Interactive Canvas Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`boundary-canvas-pane ${activeMobileTab !== 'CANVAS' ? 'mobile-hidden' : ''}`}
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
                <pattern id="grid_boundary" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid_boundary)" />
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
                    opacity="0.5"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Land Polygon Filled Interior */}
                {polygon.length >= 3 && (
                  <polygon
                    points={pointsSvgStr}
                    fill="rgba(37, 99, 235, 0.14)"
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
              bottom: '12px',
              left: '12px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #1e293b',
              fontSize: '0.70rem',
              color: '#94a3b8',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span>• Zoom: {Math.round(scale * 100)}%</span>
              <span>• Tool: <strong style={{ color: '#60a5fa' }}>{activeTool}</strong></span>
              <span>• Touch / Drag points to modify</span>
            </div>
          </div>

          {/* Right Geometric Analysis & Confirmation Panel */}
          <div
            className={`boundary-inspector-pane ${activeMobileTab === 'CANVAS' ? 'mobile-hidden' : ''}`}
            style={{
              width: '350px',
              maxWidth: '100%',
              background: '#090e17',
              borderLeft: '1px solid #1e293b',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
          >
            <div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0' }}>
                GEOMETRIC CHARACTERISTICS
              </h3>

              <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Shape Geometry:</span>
                  <span style={{
                    fontSize: '0.74rem', fontWeight: 800, color: '#60a5fa',
                    background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '6px'
                  }}>
                    {meta.shapeType}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Enclosed Area:</span>
                  <strong style={{ fontSize: '0.80rem', color: '#f8fafc' }}>
                    {meta.areaSqft.toLocaleString()} sq.ft ({(meta.areaSqft / 43560).toFixed(2)} acres)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Total Perimeter:</span>
                  <strong style={{ fontSize: '0.80rem', color: '#f8fafc' }}>
                    {meta.perimeterFt.toLocaleString()} ft
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Boundary Vertices:</span>
                  <strong style={{ fontSize: '0.80rem', color: '#38bdf8' }}>
                    {polygon.length} Points
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Detection Confidence:</span>
                  <strong style={{ fontSize: '0.80rem', color: '#34d399' }}>
                    {Math.round(meta.confidence * 100)}%
                  </strong>
                </div>
              </div>

              {/* Strict Notice */}
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#facc15', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>
                  <AlertTriangle style={{ width: '15px', height: '15px' }} />
                  HARD GEOMETRIC LOCK
                </div>
                <p style={{ margin: 0, fontSize: '0.71rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                  Once locked, this outer contour is strictly preserved. All roads, open spaces, and 2D plots will generate inside this exact boundary.
                </p>
              </div>

              {/* Edit Selected Vertex Manually */}
              {selectedVertexIndex !== null && polygon[selectedVertexIndex] && (
                <div style={{
                  background: '#071529',
                  border: '1px solid #1e3a8a',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa', marginBottom: '6px' }}>
                    Edit Node P{selectedVertexIndex + 1} Coordinates:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.66rem', color: '#94a3b8' }}>X (ft):</label>
                      <input
                        type="number"
                        value={manualX}
                        onChange={e => setManualX(e.target.value)}
                        style={{ width: '100%', height: '28px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.72rem', padding: '0 6px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.66rem', color: '#94a3b8' }}>Y (ft):</label>
                      <input
                        type="number"
                        value={manualY}
                        onChange={e => setManualY(e.target.value)}
                        style={{ width: '100%', height: '28px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.72rem', padding: '0 6px' }}
                      />
                    </div>
                    <button
                      onClick={handleUpdateSelectedVertex}
                      style={{
                        height: '28px', marginTop: '14px', padding: '0 10px', background: '#2563eb', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}

              {/* Vertex Coordinates List */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  Polygon Coordinate Nodes:
                </div>
                <div style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  background: '#030712',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  color: '#94a3b8'
                }}>
                  {polygon.map((p, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedVertexIndex(i);
                        setManualX(p[0]);
                        setManualY(p[1]);
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '3px 4px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: selectedVertexIndex === i ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                        color: selectedVertexIndex === i ? '#93c5fd' : '#94a3b8'
                      }}
                    >
                      <span style={{ color: selectedVertexIndex === i ? '#38bdf8' : '#60a5fa' }}>P{i + 1}:</span>
                      <span>({p[0]}, {p[1]})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={handleConfirmAndLock}
                disabled={confirming || polygon.length < 3}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isLocked ? '#10b981' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
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
                  <span>Locking Geometry & Generating 2D Plots...</span>
                ) : isLocked ? (
                  <>
                    <CheckCircle2 style={{ width: '16px', height: '16px' }} /> Boundary Confirmed & Plots Generated
                  </>
                ) : (
                  <>
                    <Lock style={{ width: '16px', height: '16px' }} /> Confirm & Generate 2D Plots
                  </>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b', margin: '6px 0 0 0' }}>
                Generates UDCPR compliant plot layout inside this exact boundary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
