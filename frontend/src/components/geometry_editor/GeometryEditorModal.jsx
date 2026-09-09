import React, { useEffect, useState, useMemo } from 'react';
import useGeometryEditor from './useGeometryEditor';
import useSnappingEngine from './useSnappingEngine';
import GeometryEditorToolbar from './GeometryEditorToolbar';
import GeometryEditorCanvas from './GeometryEditorCanvas';
import GeometryInspectorPanel from './GeometryInspectorPanel';
import GeometryValidationOverlay from './GeometryValidationOverlay';
import projectService from '../../services/projectService';
import { MapProvider } from './MapProvider';
import { GeoreferenceControls } from './GeoreferenceControls';
import { GeometryReviewPanel } from './GeometryReviewPanel';

export function GeometryEditorModal({ isOpen, onClose, projectId, layoutId, initialLayoutModel, layoutStatus, onApproved }) {
  const {
    model, setModel,
    selectedPlotIds, selectPlot,
    selectedRoadId, selectRoad, clearSelection,
    activeTool, setActiveTool,
    snapEnabled, setSnapEnabled,
    canUndo, canRedo, undo, redo,
    validateClientGeometry,
    updatePlotPolygon, updatePlotMetadata
  } = useGeometryEditor(initialLayoutModel);

  const { findSnapPoint } = useSnappingEngine({ snapEnabled });
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(layoutStatus || 'DRAFT');

  const [viewMode, setViewMode] = useState('BLUEPRINT'); // BLUEPRINT | MAP
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const initialGeoref = useMemo(() => {
    return initialLayoutModel?.metadata?.georeference || {
      status: "UNCONFIGURED", provider: "OSM", latitude: null, longitude: null,
      zoom: 18, rotation: 0, scale: 1, translation: { x: 0, y: 0 }
    };
  }, [initialLayoutModel]);

  const [georef, setGeoref] = useState(initialGeoref);
  const [georefHasChanges, setGeorefHasChanges] = useState(false);

  useEffect(() => {
    if (initialLayoutModel) {
      setModel(initialLayoutModel);
      setGeoref(initialLayoutModel?.metadata?.georeference || initialGeoref);
      setGeorefHasChanges(false);
    }
  }, [initialLayoutModel, setModel, initialGeoref]);

  if (!isOpen) return null;

  const clientVal = validateClientGeometry();

  const selectedPlot = (model.plots || []).find(p => (p.id || p.plotId) === selectedPlotIds[0]);
  const selectedRoad = (model.roads || []).find(r => (r.roadId || r.id) === selectedRoadId);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const res = await projectService.saveLayoutModel(projectId, layoutId, model, 'Edited geometry via CAD Editor');
      if (res?.layoutModel) setModel(res.layoutModel);
      alert(`Saved Version ${res?.version || 'Snapshot'} successfully!`);
    } catch (err) {
      alert(`Save Version failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveLayout = async () => {
    setIsApproving(true);
    try {
      // First save the current model if there are unsaved changes
      await projectService.saveLayoutModel(projectId, layoutId, model, 'Pre-approval geometry save');

      const res = await projectService.approveLayout(projectId, layoutId, 'Chief Architect');
      setCurrentStatus('APPROVED');
      setIsReviewOpen(false);
      alert(`Layout APPROVED and frozen successfully!\nGround Truth Version: ${res.groundTruthVersion || 'v1'}`);
      if (onApproved) onApproved(res);
    } catch (err) {
      alert(`Layout Approval failed: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleUpdateRoad = (roadId, patchData) => {
    setModel(prev => {
      const updatedRoads = (prev.roads || []).map(r => {
        if ((r.roadId || r.id) === roadId) {
          return { ...r, ...patchData };
        }
        return r;
      });
      return { ...prev, roads: updatedRoads };
    });
  };

  const handleGeorefTransformChange = (newTransform) => {
    setGeoref(prev => ({ ...prev, layoutTransform: newTransform, status: "CONFIGURED" }));
    setGeorefHasChanges(true);
  };

  const handleResetGeoref = () => {
    setGeoref(initialGeoref);
    setGeorefHasChanges(false);
  };

  const handleSaveGeoref = async () => {
    try {
      // Create a function in projectService to patch georeference
      const res = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/layouts/${layoutId}/georeference`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(georef)
      });
      if (!res.ok) throw new Error("Failed to save georeference");
      const data = await res.json();
      setGeoref(data.georeference);
      setGeorefHasChanges(false);
      alert("Geographic alignment saved successfully.");
    } catch (err) {
      alert(err.message);
    }
  };

  const renderCanvas = () => (
    <GeometryEditorCanvas
      model={model}
      selectedPlotIds={selectedPlotIds}
      selectedRoadId={selectedRoadId}
      onSelectPlot={selectPlot}
      onSelectRoad={selectRoad}
      onClearSelection={clearSelection}
      onUpdatePlotPolygon={updatePlotPolygon}
      activeTool={activeTool}
      findSnapPoint={findSnapPoint}
      snapEnabled={snapEnabled}
      viewMode={viewMode}
      georef={georef}
    />
  );

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/90 backdrop-blur-sm flex flex-col font-sans pointer-events-auto">
      <GeometryEditorToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        snapEnabled={snapEnabled}
        setSnapEnabled={setSnapEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        validationResult={clientVal}
        layoutStatus={currentStatus}
        onSaveVersion={handleSaveVersion}
        onOpenReview={() => setIsReviewOpen(true)}
        onClose={onClose}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="relative flex-1 flex overflow-hidden">
        <GeometryValidationOverlay validationResult={clientVal} />

        {isReviewOpen && (
          <GeometryReviewPanel
            onClose={() => setIsReviewOpen(false)}
            onApprove={handleApproveLayout}
            model={model}
            validationResult={clientVal}
            georef={georef}
            isApproving={isApproving}
          />
        )}

        {viewMode === 'MAP' && (
          <GeoreferenceControls
            georef={georef}
            onTransformChange={handleGeorefTransformChange}
            onReset={handleResetGeoref}
            onSave={handleSaveGeoref}
            hasChanges={georefHasChanges}
          />
        )}

        <div className="flex-1 relative">
          {viewMode === 'MAP' ? (
            <MapProvider georef={georef} onGeorefChange={(g) => { setGeoref(g); setGeorefHasChanges(true); }}>
              {renderCanvas()}
            </MapProvider>
          ) : (
            renderCanvas()
          )}
        </div>

        <GeometryInspectorPanel
          selectedPlot={selectedPlot}
          selectedRoad={selectedRoad}
          onUpdatePlot={updatePlotMetadata}
          onUpdateRoad={handleUpdateRoad}
        />
      </div>
    </div>
  );
}

export default GeometryEditorModal;
