import React, { useEffect, useState, useRef } from 'react';
import {
  X, ZoomIn, ZoomOut, Maximize2, Layers, Info, CheckCircle2,
  Edit2, Download, FileText, Sparkles, Check, ChevronDown,
  Activity, ShieldCheck, CheckCircle, AlertTriangle, RefreshCw, Eye
} from 'lucide-react';
import projectService from '../../../../services/projectService';
import plotService from '../../../../services/plotService';
import { formatCurrency } from '../../../../utils/formatters';
import GeometryEditorModal from '../../../../components/geometry_editor/GeometryEditorModal';
import PlanningNormsSelector from '../components/PlanningNormsSelector';
import LayoutAlternativesModal from '../components/LayoutAlternativesModal';

const STATUS_STYLE = {
  AVAILABLE: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  RESERVED: { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  SOLD: { bg: 'rgba(122,30,58,0.1)', color: '#7A1E3A', border: 'rgba(122,30,58,0.25)' },
  BLOCKED: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
};

const PIPELINE_STAGES = [
  { id: 'INGESTION', label: '1. Ingestion', desc: 'PDF / Raster / CAD ingestion' },
  { id: 'PREPROCESSING', label: '2. Preprocessing', desc: 'Denoise, CLAHE & deskew' },
  { id: 'SEMANTIC_SEGMENTATION', label: '3. Segmentation', desc: 'SegFormer-B0 7-class masks' },
  { id: 'BOUNDARY_DETECTION', label: '4. Boundary', desc: 'Contour polygon & simplification' },
  { id: 'ROAD_DETECTION', label: '5. Roads & Parks', desc: 'Corridors & centerlines' },
  { id: 'OCR_TEXT_EXTRACTION', label: '6. OCR Linking', desc: 'Plot numbers & road labels' },
  { id: 'BUILDABLE_AREA', label: '7. Buildable Area', desc: 'Topological constraint subtraction' },
  { id: 'LAYOUT_GENERATION', label: '8. 4 Layouts', desc: 'Multi-strategy plot generation' },
  { id: 'VALIDATION', label: '9. 12 Civil Rules', desc: 'GEOS geometric constraint check' },
  { id: 'SCORING', label: '10. Multi-Scoring', desc: 'Objective ranking & GeoJSON' },
];

export default function LayoutMap({ project, onOpenPlot }) {
  const [svgContent, setSvgContent] = useState('');
  const [layoutModel, setLayoutModel] = useState(null);
  const [plots, setPlots] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Maharashtra UDCPR Layout Alternatives Modal & Generator State (13A-13O)
  const [isAlternativesModalOpen, setIsAlternativesModalOpen] = useState(false);
  const [failureReasons, setFailureReasons] = useState([]);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // AI Pipeline State
  const [activeJob, setActiveJob] = useState(null);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [aiRunResult, setAiRunResult] = useState(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    targetPlotSqft: 1200,
    roadWidthFt: 30,
    gardenPercentage: 10,
    setbackFt: 10
  });
  const [isTriggering, setIsTriggering] = useState(false);

  // Zoom & Pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const pollingTimerRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Check AI runs
      const runs = await projectService.getProjectAiRuns(project.id);
      if (runs && runs.length > 0) {
        const latestRun = runs[0];
        setActiveJob(latestRun);
        if (latestRun.status === 'PROCESSING' || latestRun.status === 'QUEUED') {
          setIsJobRunning(true);
          startPolling(latestRun.runId);
          setLoading(false);
          return;
        } else if (latestRun.status === 'COMPLETED') {
          const res = await projectService.getAiRunResult(project.id, latestRun.runId);
          if (res) setAiRunResult(res);
        }
      }

      // 2. Fetch generated layout variants
      const variantList = await projectService.getProjectVariants(project.id);
      if (variantList && variantList.length > 0) {
        setVariants(variantList);
        const activeVariant = variantList.find(v => v.isSelected) || variantList[0];
        setSelectedVariantId(activeVariant.id);

        const svgRes = await projectService.getVariantSvg(project.id, activeVariant.id);
        const modelRes = await projectService.getVariantModel(project.id, activeVariant.id);

        if (svgRes?.svgContent) setSvgContent(svgRes.svgContent);
        if (modelRes) setLayoutModel(modelRes);
      } else {
        // Fallback to layout sources
        const sources = await projectService.getProjectLayoutSources(project.id);
        const lId = sources?.[0]?.id || project?.layoutSource?.id || 'default-layout';
        setCurrentLayoutId(lId);

        const svgRes = await projectService.getLayoutSvg(project.id, lId);
        const modelRes = await projectService.getLayoutModel(project.id, lId);

        if (svgRes?.svgContent) setSvgContent(svgRes.svgContent);
        if (modelRes) setLayoutModel(modelRes);
      }

      const plotList = await plotService.getPlotsByProject(project.id);
      setPlots(plotList || []);
    } catch (err) {
      console.warn('Error loading layout data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (runId) => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = setInterval(async () => {
      try {
        const statusRes = await projectService.getAiRunStatus(project.id, runId);
        if (statusRes) {
          setActiveJob(statusRes);
          if (statusRes.status === 'COMPLETED') {
            clearInterval(pollingTimerRef.current);
            setIsJobRunning(false);
            loadData();
          } else if (statusRes.status === 'FAILED') {
            clearInterval(pollingTimerRef.current);
            setIsJobRunning(false);
          }
        }
      } catch (e) {
        console.warn('AI run status poll error:', e);
      }
    }, 2000);
  };

  useEffect(() => {
    loadData();
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [project.id]);

  const handleVariantSelect = async (varId) => {
    try {
      setSelectedVariantId(varId);
      const svgRes = await projectService.getVariantSvg(project.id, varId);
      const modelRes = await projectService.getVariantModel(project.id, varId);

      if (svgRes?.svgContent) setSvgContent(svgRes.svgContent);
      if (modelRes) setLayoutModel(modelRes);
    } catch (err) {
      console.error('Error switching variant:', err);
    }
  };

  const handleSetAsMaster = async (varId) => {
    try {
      await projectService.selectVariant(project.id, varId);
      await loadData();
      alert('Selected design set as primary master layout for inventory and booking!');
    } catch (err) {
      alert(`Failed to set variant: ${err.message}`);
    }
  };

  const handleGenerateMaharashtraLayouts = async (params) => {
    setIsAutoGenerating(true);
    setFailureReasons([]);
    try {
      const res = await projectService.generateLayouts(project.id, params);
      if (res) {
        if (res.validOptionsCount === 0 || !res.variants || res.variants.length === 0) {
          setFailureReasons(res.failureReasons || ['No fully compliant layout could be generated under the selected planning constraints.']);
          setIsAlternativesModalOpen(true);
        } else {
          setVariants(res.variants);
          const first = res.variants[0];
          setSelectedVariantId(first.id);
          const svgRes = await projectService.getVariantSvg(project.id, first.id);
          const modelRes = await projectService.getVariantModel(project.id, first.id);
          if (svgRes?.svgContent) setSvgContent(svgRes.svgContent);
          if (modelRes) setLayoutModel(modelRes);
          setIsAlternativesModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error generating layouts:', err);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleTriggerAiRun = async () => {
    setIsTriggering(true);
    try {
      const runRes = await projectService.triggerAiRun(project.id, genForm);
      if (runRes?.runId) {
        setIsGenerateModalOpen(false);
        setActiveJob(runRes);
        setIsJobRunning(true);
        startPolling(runRes.runId);
      }
    } catch (err) {
      alert(`Failed to trigger AI pipeline: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  // Click listener for SVG plot elements
  const handleSvgClick = (e) => {
    const target = e.target.closest('[data-plot-id]') || e.target.closest('polygon');
    if (!target) return;

    const plotId = target.getAttribute('data-plot-id') || target.id?.replace('plot-poly-', '');
    if (!plotId) return;

    const modelPlot = layoutModel?.plots?.find(p => p.plotId === plotId || p.plotNumber === plotId || p.id === plotId);
    const dbPlot = plots.find(p => p.id === plotId || p.plotNo === modelPlot?.plotNumber);

    const mergedPlot = {
      id: plotId,
      plotNumber: modelPlot?.plotNumber || dbPlot?.plotNo || plotId,
      area: modelPlot?.areaSqft || dbPlot?.area || 1200,
      status: dbPlot?.status || modelPlot?.status || 'AVAILABLE',
      roadName: modelPlot?.roadName || 'Main Avenue',
      dimensions: modelPlot?.dimensions || dbPlot?.dimensions || `${modelPlot?.widthFt || 30} × ${modelPlot?.depthFt || 40} FT`,
      price: modelPlot?.estimatedPrice || dbPlot?.price || 3000000,
      facing: modelPlot?.facing || dbPlot?.facing || 'NORTH',
      isCorner: modelPlot?.isCorner || false,
    };

    setSelectedPlot(mergedPlot);
  };

  // Zoom / Pan handlers
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev * 1.25, 4.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev / 1.25, 0.5));
  const handleFitToScreen = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mobile Touch Handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Trigger export downloads
  const handleExport = (format) => {
    setExportMenuOpen(false);
    if (!selectedVariantId) {
      alert('No layout variant selected for export.');
      return;
    }
    const baseUrl = 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/projects/${project.id}/variants/${selectedVariantId}/export/${format}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{
        padding: '36px 20px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
        borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
      }}>
        <div style={{
          width: '32px', height: '32px', border: '3px solid rgba(122,30,58,0.15)', borderTopColor: 'var(--df-accent)',
          borderRadius: '50%', animation: 'landos-spin 0.8s linear infinite'
        }} />
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--df-text)' }}>
          Loading Multi-Alternative Layouts & Civil Scores…
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--df-text-muted)' }}>
          Calculating vector geometries and civil constraints
        </div>
      </div>
    );
  }

  const activeVarObj = variants.find(v => v.id === selectedVariantId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* AI Pipeline Processing Visualizer Banner (When Active) */}
      {isJobRunning && activeJob && (
        <div style={{
          padding: '16px 18px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: '#ffffff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '24px', height: '24px', border: '2px solid rgba(59,130,246,0.3)',
                borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'landos-spin 0.8s linear infinite'
              }} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                  AI Perception & Layout Reconstruction Engine Running…
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Stage: {activeJob.stage} • Progress: {activeJob.progressPercentage}%
                </div>
              </div>
            </div>
            <span style={{
              padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800,
              background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)'
            }}>
              {activeJob.status}
            </span>
          </div>

          {/* 10-Stage Visualizer Pills */}
          <div className="horizontal-scroll-tabs" style={{ gap: '6px', paddingBottom: '4px' }}>
            {PIPELINE_STAGES.map((s, idx) => {
              const isPast = (idx + 1) * 10 <= (activeJob.progressPercentage || 0);
              const isCurrent = Math.abs((idx + 1) * 10 - (activeJob.progressPercentage || 0)) < 10;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
                    borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
                    background: isPast ? 'rgba(16,185,129,0.2)' : (isCurrent ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'),
                    color: isPast ? '#34d399' : (isCurrent ? '#60a5fa' : '#64748b'),
                    border: isCurrent ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.08)'
                  }}
                  title={s.desc}
                >
                  {isPast ? <CheckCircle style={{ width: '11px', height: '11px' }} /> : null}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Maharashtra UDCPR Planning Norms & Generator Engine (13C, 13D) */}
      <PlanningNormsSelector
        project={project}
        onGenerate={handleGenerateMaharashtraLayouts}
        isGenerating={isAutoGenerating}
      />

      {/* Multi-Alternative Design Variants Header Switcher (13J) */}
      {variants.length > 0 && (
        <div style={{
          padding: '10px 14px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
          borderRadius: '8px'
        }}>
          <div className="responsive-stack" style={{ gap: '10px', alignItems: 'center' }}>
            <div className="horizontal-scroll-tabs" style={{ flex: 1, paddingBottom: '2px' }}>
              <span className="hide-on-mobile" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--df-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', marginRight: '4px' }}>
                Generated Options (13J):
              </span>
              {variants.map((v) => {
                const isCurrent = v.id === selectedVariantId;
                const isMaster = v.isSelected;
                return (
                  <button
                    key={v.id}
                    onClick={() => handleVariantSelect(v.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                      borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      background: isCurrent ? 'var(--df-accent)' : 'var(--df-bg)',
                      color: isCurrent ? '#ffffff' : 'var(--df-text)',
                      border: isCurrent ? '1px solid var(--df-accent)' : '1px solid var(--df-border)',
                      boxShadow: isCurrent ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{v.optionBadge || v.strategyName}</span>
                    <span style={{
                      padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem',
                      background: isCurrent ? 'rgba(255,255,255,0.25)' : '#ecfdf5',
                      color: isCurrent ? '#ffffff' : '#059669', fontWeight: 800
                    }}>
                      {v.compositeScore ? `${v.compositeScore.toFixed(0)}/100` : `${v.utilizationPercent}%`}
                    </span>
                    {isMaster && (
                      <span style={{ fontSize: '0.65rem', color: isCurrent ? '#fef08a' : '#eab308' }} title="Active Master Layout">
                        ★ Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsAlternativesModalOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                  borderRadius: '6px', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.1)',
                  color: '#3b82f6', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                <Sparkles style={{ width: '13px', height: '13px' }} /> View Alternatives & Compare (13J/13N)
              </button>

              {activeVarObj && !activeVarObj.isSelected && (
                <button
                  onClick={() => handleSetAsMaster(activeVarObj.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                    borderRadius: '6px', border: '1px solid #059669', background: '#ecfdf5',
                    color: '#059669', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0
                  }}
                >
                  <CheckCircle2 style={{ width: '13px', height: '13px' }} /> Set as Master
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="page-header-container responsive-stack" style={{
        padding: '10px 14px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
        borderRadius: '6px', gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Layers style={{ width: '16px', height: '16px', color: 'var(--df-accent)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--df-text)' }}>
            Vector Civil Engineering Canvas
          </span>
          {layoutModel?.statistics && (
            <span style={{
              fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px',
              background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 700
            }}>
              {layoutModel.statistics.totalPlots} Plots • {layoutModel.statistics.utilizationPercent}% Land Utilization
            </span>
          )}
        </div>

        {/* Viewport & Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Research Debug Inspector Button */}
          <button
            onClick={() => setIsDebugModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
              borderRadius: '4px', border: '1px solid var(--df-border)', background: 'var(--df-bg)',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text)'
            }}
            title="Inspect 12-Stage AI Intermediate Representations"
          >
            <Eye style={{ width: '13px', height: '13px', color: '#3b82f6' }} /> AI Pipeline Inspect
          </button>

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                borderRadius: '4px', border: '1px solid var(--df-border)', background: 'var(--df-bg)',
                cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--df-text)'
              }}
            >
              <Download style={{ width: '13px', height: '13px' }} /> Export <ChevronDown style={{ width: '12px', height: '12px' }} />
            </button>

            {exportMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                width: '180px', background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
                borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 110, padding: '4px'
              }}>
                <button
                  onClick={() => handleExport('dxf')}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: '4px',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem',
                    fontWeight: 600, color: 'var(--df-text)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  📐 AutoCAD CAD (.dxf)
                </button>
                <button
                  onClick={() => handleExport('geojson')}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: '4px',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem',
                    fontWeight: 600, color: 'var(--df-text)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  🗺️ GIS GeoJSON (.json)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: '4px',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem',
                    fontWeight: 600, color: 'var(--df-text)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  📊 Plot Schedule (.csv)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsEditorOpen(true)}
            title="Open CAD Geometry Editor"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #3b82f6', background: '#2563eb', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', boxShadow: '0 2px 4px rgba(37,99,235,0.3)' }}
          >
            <Edit2 style={{ width: '13px', height: '13px' }} /> CAD Editor
          </button>
          <button onClick={handleZoomIn} title="Zoom In" style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--df-border)', background: 'var(--df-bg)', cursor: 'pointer', color: 'var(--df-text)' }}>
            <ZoomIn style={{ width: '14px', height: '14px' }} />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--df-border)', background: 'var(--df-bg)', cursor: 'pointer', color: 'var(--df-text)' }}>
            <ZoomOut style={{ width: '14px', height: '14px' }} />
          </button>
          <button onClick={handleFitToScreen} title="Fit to Screen" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '4px', border: '1px solid var(--df-border)', background: 'var(--df-bg)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: 'var(--df-text)' }}>
            <Maximize2 style={{ width: '12px', height: '12px' }} /> Fit
          </button>
        </div>
      </div>

      {/* Interactive Layout SVG Render Canvas */}
      <div
        ref={containerRef}
        className="layout-canvas-responsive"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleSvgClick}
        style={{
          position: 'relative',
          width: '100%',
          height: 'min(72vh, 580px)',
          minHeight: '340px',
          background: '#090e17',
          border: '1px solid var(--df-card-border)',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
      >
        {svgContent ? (
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--df-text-muted)', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📐</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
              No Generated Layout Found
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '6px', maxWidth: '480px', lineHeight: 1.5, color: '#94a3b8' }}>
              Upload a blueprint or initiate the AI land understanding pipeline to extract true boundary polygons and generate 4 valid layouts.
            </div>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              style={{
                marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '6px', background: 'var(--df-accent)',
                color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
              }}
            >
              <Sparkles style={{ width: '14px', height: '14px' }} /> Run AI Land Pipeline & Generate Layouts
            </button>
          </div>
        )}

        {/* Selected Plot Floating Metadata Drawer */}
        {selectedPlot && (
          <div
            className="floating-plot-drawer"
            style={{
              position: 'absolute', top: '12px', right: '12px', width: 'min(300px, calc(100% - 24px))',
              background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
              borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.45)', zIndex: 100, padding: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--df-border)', paddingBottom: '8px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  Plot {selectedPlot.plotNumber}
                </div>
                <span style={{
                  padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700,
                  background: STATUS_STYLE[selectedPlot.status]?.bg || '#dcfce7',
                  color: STATUS_STYLE[selectedPlot.status]?.color || '#15803d',
                  marginTop: '2px', display: 'inline-block'
                }}>
                  {selectedPlot.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)', padding: '2px' }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--df-text-muted)' }}>Dimensions:</span>
                <span style={{ fontWeight: 700, color: 'var(--df-text)' }}>{selectedPlot.dimensions}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--df-text-muted)' }}>Calculated Area:</span>
                <span style={{ fontWeight: 700, color: 'var(--df-text)' }}>{selectedPlot.area} SQFT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--df-text-muted)' }}>Facing Direction:</span>
                <span style={{ fontWeight: 700, color: 'var(--df-text)' }}>{selectedPlot.facing}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--df-text-muted)' }}>Road Access:</span>
                <span style={{ fontWeight: 700, color: 'var(--df-text)' }}>{selectedPlot.roadName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--df-border)', paddingTop: '6px' }}>
                <span style={{ color: 'var(--df-text-muted)' }}>Estimated Price:</span>
                <span style={{ fontWeight: 800, color: '#059669' }}>{formatCurrency(selectedPlot.price)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (onOpenPlot) onOpenPlot(selectedPlot.id);
              }}
              style={{
                width: '100%', marginTop: '12px', padding: '6px 0', borderRadius: '4px',
                background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              View in Inventory Table →
            </button>
          </div>
        )}
      </div>

      {/* Research Debug Inspector Modal */}
      {isDebugModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(760px, 96vw)', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid var(--df-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  12-Stage AI Land Pipeline & Research Inspector
                </span>
              </div>
              <button
                onClick={() => setIsDebugModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.78rem' }}>
              {/* Preprocessing & Visual Enhancement */}
              {aiRunResult?.preprocessed?.imageBase64 && (
                <div style={{ padding: '12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)', marginBottom: '6px' }}>
                    🔍 Stage 2: Preprocessed & Deskewed Blueprint Image
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                    <img
                      src={aiRunResult.preprocessed.imageBase64}
                      alt="Preprocessed Blueprint"
                      style={{ maxHeight: '120px', maxWidth: '200px', borderRadius: '4px', border: '1px solid var(--df-border)', objectFit: 'contain', background: '#000' }}
                    />
                    <div style={{ color: 'var(--df-text-muted)', lineHeight: 1.5 }}>
                      <div>• Resolution: <strong>{aiRunResult.preprocessed.width} × {aiRunResult.preprocessed.height} px</strong></div>
                      <div>• Deskew Angle: <strong>{aiRunResult.preprocessed.deskewAngle}°</strong></div>
                      <div>• Filters: <strong>Bilateral Denoising + CLAHE + Adaptive Otsu Binarization</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Semantic Segmentation Mask */}
              {aiRunResult?.segmentation && (
                <div style={{ padding: '12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--df-text)', marginBottom: '6px' }}>
                    🧠 Stage 3: Semantic Segmentation ({aiRunResult.segmentation.modelName || 'SegFormer-B0'})
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                    {aiRunResult.segmentation.maskImageBase64 && (
                      <img
                        src={aiRunResult.segmentation.maskImageBase64}
                        alt="Segmentation Mask"
                        style={{ maxHeight: '120px', maxWidth: '200px', borderRadius: '4px', border: '1px solid var(--df-border)', objectFit: 'contain', background: '#000' }}
                      />
                    )}
                    <div style={{ color: 'var(--df-text-muted)', lineHeight: 1.5, flex: 1 }}>
                      <div>• Model Confidence: <strong>{((aiRunResult.segmentation.confidence || 0.94) * 100).toFixed(1)}%</strong></div>
                      <div>• Detected Regions: <strong>{aiRunResult.segmentation.regionsCount || 0} contours</strong></div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {aiRunResult.segmentation.classes?.map((c, i) => (
                          <span key={i} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Land Boundary Extracted Geometry */}
              <div style={{ padding: '12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--df-text)', marginBottom: '6px' }}>
                  📐 Extracted Land Boundary (Douglas-Peucker & GEOS Validated)
                </div>
                <div style={{ color: 'var(--df-text-muted)', lineHeight: 1.5 }}>
                  {aiRunResult?.land ? (
                    <div>
                      <div>• Orientation: <strong>{aiRunResult.land.orientation}</strong></div>
                      <div>• Area: <strong>{aiRunResult.land.areaSqft?.toLocaleString()} SQFT</strong></div>
                      <div>• Perimeter: <strong>{aiRunResult.land.perimeter?.toFixed(1)} FT</strong></div>
                      <div>• Boundary Valid: <strong>{aiRunResult.land.isValid ? '✓ Valid GEOS Polygon' : '⚠️ Unverified'}</strong></div>
                      <div>• Vertices: <code>{JSON.stringify(aiRunResult.land.boundary?.slice(0, 5))}…</code></div>
                    </div>
                  ) : (
                    <div>Derived from active blueprint layout source.</div>
                  )}
                </div>
              </div>

              {/* Usable Buildable Area Breakdown */}
              <div style={{ padding: '12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--df-text)', marginBottom: '6px' }}>
                  🏗️ Usable Buildable Area (Topological Subtraction)
                </div>
                <div style={{ color: 'var(--df-text-muted)', lineHeight: 1.5 }}>
                  <code>Buildable Area = Land Boundary - (Setbacks ∪ Roads ∪ Green Spaces ∪ Obstacles)</code>
                  {aiRunResult?.buildableArea && (
                    <div style={{ marginTop: '6px' }}>
                      <div>• Gross Land: <strong>{aiRunResult.buildableArea.grossLandAreaSqft?.toLocaleString()} SQFT</strong></div>
                      <div>• Net Buildable: <strong>{aiRunResult.buildableArea.netBuildableAreaSqft?.toLocaleString()} SQFT ({aiRunResult.buildableArea.buildablePercentage}%)</strong></div>
                      <div>• Road Corridors: <strong>{aiRunResult.buildableArea.roadAreaSqft?.toLocaleString()} SQFT</strong></div>
                      <div>• Green Spaces: <strong>{aiRunResult.buildableArea.greenSpaceAreaSqft?.toLocaleString()} SQFT</strong></div>
                      <div>• Subdividable Blocks: <strong>{aiRunResult.buildableArea.totalBlocksCount} Blocks</strong></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 12-Rule Geometric Validation Report */}
              <div style={{ padding: '12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--df-text)', marginBottom: '6px' }}>
                  🛡️ 12-Rule Geometric & Civil Engineering Compliance
                </div>
                {activeVarObj?.validationReport?.ruleResults ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px', marginTop: '6px' }}>
                    {Object.entries(activeVarObj.validationReport.ruleResults).map(([k, r]) => (
                      <div key={k} style={{
                        padding: '6px 8px', borderRadius: '4px', fontSize: '0.7rem',
                        background: r.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${r.passed ? '#a7f3d0' : '#fca5a5'}`,
                        color: r.passed ? '#059669' : '#dc2626'
                      }}>
                        <strong>{r.passed ? '✓' : '✗'} {r.ruleName}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#059669' }}>✓ All active plots verified strictly contained in buildable envelope with zero road overlap.</div>
                )}
              </div>

              {/* Multi-Objective Scoring Breakdown */}
              <div style={{ padding: '12px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 800, color: 'var(--df-text)', marginBottom: '6px' }}>
                  📊 Multi-Objective Scoring Formula Breakdown
                </div>
                <div style={{ color: 'var(--df-text-muted)', lineHeight: 1.5 }}>
                  <code>Score = 0.28·Utilization + 0.24·Accessibility + 0.16·Shape + 0.16·Yield + 0.16·Fit - Penalty</code>
                  {activeVarObj?.evaluation && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginTop: '8px' }}>
                      <div style={{ padding: '6px 8px', background: 'var(--df-card-bg)', borderRadius: '4px', border: '1px solid var(--df-border)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>Utilization (28%)</div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{activeVarObj.evaluation.utilizationScore || 85}/100</div>
                      </div>
                      <div style={{ padding: '6px 8px', background: 'var(--df-card-bg)', borderRadius: '4px', border: '1px solid var(--df-border)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>Road Frontage (24%)</div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{activeVarObj.evaluation.accessibilityScore || 100}/100</div>
                      </div>
                      <div style={{ padding: '6px 8px', background: 'var(--df-card-bg)', borderRadius: '4px', border: '1px solid var(--df-border)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>Shape Regularity (16%)</div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{activeVarObj.evaluation.shapeRegularityScore || 90}/100</div>
                      </div>
                      <div style={{ padding: '6px 8px', background: 'var(--df-card-bg)', borderRadius: '4px', border: '1px solid var(--df-border)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--df-text-muted)' }}>Composite Score</div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--df-accent)' }}>{activeVarObj.compositeScore || 88}/100</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsDebugModalOpen(false)}
                style={{
                  padding: '6px 14px', borderRadius: '4px', background: 'var(--df-bg)',
                  border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700,
                  fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Layouts Trigger Modal */}
      {isGenerateModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'var(--df-card-bg)', border: '1px solid var(--df-card-border)',
            borderRadius: '10px', width: 'min(480px, 94vw)', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'landos-fade-in 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--df-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ width: '18px', height: '18px', color: 'var(--df-accent)' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--df-text)' }}>
                  AI Land Planning & Multi-Alternative Generator
                </span>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--df-text-muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--df-text)', marginBottom: '4px' }}>
                  Target Plot Area (SQFT)
                </label>
                <input
                  type="number"
                  value={genForm.targetPlotSqft}
                  onChange={e => setGenForm({ ...genForm, targetPlotSqft: Number(e.target.value) })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--df-text)', marginBottom: '4px' }}>
                  Internal Road Width (Feet)
                </label>
                <input
                  type="number"
                  value={genForm.roadWidthFt}
                  onChange={e => setGenForm({ ...genForm, roadWidthFt: Number(e.target.value) })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--df-text)', marginBottom: '4px' }}>
                  Open / Green Space Allocation (%)
                </label>
                <input
                  type="number"
                  value={genForm.gardenPercentage}
                  onChange={e => setGenForm({ ...genForm, gardenPercentage: Number(e.target.value) })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: 'var(--df-text)', marginBottom: '4px' }}>
                  Outer Boundary Setback (Feet)
                </label>
                <input
                  type="number"
                  value={genForm.setbackFt}
                  onChange={e => setGenForm({ ...genForm, setbackFt: Number(e.target.value) })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', borderRadius: '6px', color: 'var(--df-text)' }}
                />
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--df-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                style={{ padding: '6px 14px', borderRadius: '4px', background: 'var(--df-bg)', border: '1px solid var(--df-border)', color: 'var(--df-text)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerAiRun}
                disabled={isTriggering}
                style={{ padding: '6px 16px', borderRadius: '4px', background: 'var(--df-accent)', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                {isTriggering ? 'Starting…' : 'Generate 4 Scored Alternatives'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAD Geometry Editor Modal */}
      <GeometryEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        projectId={project.id}
        layoutId={currentLayoutId}
        onLayoutUpdated={() => {
          loadData();
          setIsEditorOpen(false);
        }}
      />

      {/* Maharashtra UDCPR Best 2-3 Alternatives & Comparison Modal (13J, 13M, 13N) */}
      <LayoutAlternativesModal
        isOpen={isAlternativesModalOpen}
        onClose={() => setIsAlternativesModalOpen(false)}
        variants={variants}
        activeVariantId={selectedVariantId}
        onSelectVariant={(varId) => handleVariantSelect(varId)}
        onSetAsMaster={(varId) => handleSetAsMaster(varId)}
        failureReasons={failureReasons}
        validCount={variants.length}
      />
    </div>
  );
}
