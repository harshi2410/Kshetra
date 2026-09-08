import React from 'react';
import { 
  Pointer, Move, Scissors, Combine, RotateCw, Magnet, 
  Undo2, Redo2, CheckCircle2, AlertTriangle, Save, Lock, FileCheck 
} from 'lucide-react';

export function GeometryEditorToolbar({
  activeTool,
  setActiveTool,
  snapEnabled,
  setSnapEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  validationResult,
  layoutStatus,
  onSaveVersion,
  onOpenReview,
  onClose,
  viewMode,
  setViewMode
}) {
  const tools = [
    { id: 'SELECT', label: 'Select (S)', icon: Pointer },
    { id: 'MOVE_PLOT', label: 'Move Plot (M)', icon: Move },
    { id: 'MOVE_VERTEX', label: 'Edit Vertex (V)', icon: Pointer },
    { id: 'SPLIT_PLOT', label: 'Split Plot', icon: Scissors },
    { id: 'MERGE_PLOTS', label: 'Merge Plots', icon: Combine },
    { id: 'ROTATE', label: 'Rotate Plot', icon: RotateCw },
  ];

  const isApproved = layoutStatus === 'APPROVED' || layoutStatus === 'LOCKED';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 text-white select-none overflow-x-auto gap-3" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
      {/* LEFT: TOOLS & SNAPPING */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Geometry Tools:</span>
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              disabled={isApproved}
              title={tool.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40'
              }`}
            >
              <Icon size={14} />
              <span>{tool.label.split(' ')[0]}</span>
            </button>
          );
        })}

        <div className="h-5 w-[1px] bg-slate-700 mx-2" />

        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
            snapEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Toggle Vertex Snapping Engine"
        >
          <Magnet size={14} />
          <span>Snap {snapEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* CENTER: UNDO/REDO & VALIDATION INDICATOR */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo || isApproved}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || isApproved}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-xs">
          {validationResult?.isValid ? (
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 size={14} /> GEOS Validated
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1 font-semibold">
              <AlertTriangle size={14} /> {validationResult?.errors?.length || 0} Issues
            </span>
          )}
        </div>
      </div>

      {/* RIGHT: SAVE, APPROVE & STATUS */}
      <div className="flex items-center gap-2">
        <div className="text-xs px-2 py-1 rounded font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
          Status: <span className={isApproved ? 'text-emerald-400' : 'text-blue-400'}>{layoutStatus || 'DRAFT'}</span>
        </div>

        {!isApproved ? (
          <>
            <button
              onClick={onSaveVersion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
            >
              <Save size={14} />
              <span>Save Version</span>
            </button>

            <button
              onClick={onOpenReview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            >
              <FileCheck size={14} />
              <span>Review & Approve</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Lock size={13} />
            <span>Geometry Frozen</span>
          </div>
        )}

        <div className="flex bg-slate-800 p-0.5 rounded ml-2">
          <button
            onClick={() => setViewMode && setViewMode('BLUEPRINT')}
            className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${viewMode === 'BLUEPRINT' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Blueprint
          </button>
          <button
            onClick={() => setViewMode && setViewMode('MAP')}
            className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${viewMode === 'MAP' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Map
          </button>
        </div>

        <button onClick={onClose} className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold ml-2">✕</button>
      </div>
    </div>
  );
}

export default GeometryEditorToolbar;
