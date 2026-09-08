import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileCheck, X } from 'lucide-react';

export function GeometryReviewPanel({
  onClose,
  onApprove,
  model,
  validationResult,
  georef,
  isApproving
}) {
  const [checklist, setChecklist] = useState({
    geom_boundary: false,
    geom_plots: false,
    geom_roads: false,
    geom_overlaps: false,
    
    text_plots: false,
    text_roads: false,
    text_ocr: false,
    
    meta_areas: false,
    meta_dims: false,
    meta_facing: false,
    meta_access: false,
    
    geo_loc: false,
    geo_north: false
  });

  const handleToggle = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklist).every(Boolean);
  const isValid = validationResult?.isValid;
  const isReady = allChecked && isValid;

  // Stats
  const plots = model?.plots || [];
  const roads = model?.roads || [];
  const ocrAssignments = model?.ocrAssignments || [];
  
  const ocrCorrectedCount = plots.filter(p => p.reviewMetadata?.plotNumber?.reviewStatus === 'CORRECTED').length;

  return (
    <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center pointer-events-auto p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-full overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="text-emerald-500" /> Human Review & Approval
            </h2>
            <p className="text-xs text-slate-400 mt-1">Complete the mandatory checklist before locking the layout into Ground Truth.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Checklist */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Mandatory Checklist</h3>
            
            <div className="space-y-6">
              {/* Geometry */}
              <div>
                <h4 className="text-xs font-semibold text-blue-400 mb-2">1. Geometry Verification</h4>
                <div className="space-y-2">
                  <CheckItem label="Project boundary verified" checked={checklist.geom_boundary} onChange={() => handleToggle('geom_boundary')} />
                  <CheckItem label="All plots verified" checked={checklist.geom_plots} onChange={() => handleToggle('geom_plots')} />
                  <CheckItem label="Roads verified" checked={checklist.geom_roads} onChange={() => handleToggle('geom_roads')} />
                  <CheckItem label="Plot/road overlaps checked" checked={checklist.geom_overlaps} onChange={() => handleToggle('geom_overlaps')} />
                </div>
              </div>

              {/* Text */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-400 mb-2">2. Text & OCR</h4>
                <div className="space-y-2">
                  <CheckItem label="Plot numbers verified" checked={checklist.text_plots} onChange={() => handleToggle('text_plots')} />
                  <CheckItem label="Road names verified" checked={checklist.text_roads} onChange={() => handleToggle('text_roads')} />
                  <CheckItem label="OCR corrections reviewed" checked={checklist.text_ocr} onChange={() => handleToggle('text_ocr')} />
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h4 className="text-xs font-semibold text-amber-400 mb-2">3. Plot Metadata</h4>
                <div className="space-y-2">
                  <CheckItem label="Plot areas verified" checked={checklist.meta_areas} onChange={() => handleToggle('meta_areas')} />
                  <CheckItem label="Dimensions verified" checked={checklist.meta_dims} onChange={() => handleToggle('meta_dims')} />
                  <CheckItem label="Facing verified" checked={checklist.meta_facing} onChange={() => handleToggle('meta_facing')} />
                  <CheckItem label="Road access verified" checked={checklist.meta_access} onChange={() => handleToggle('meta_access')} />
                </div>
              </div>

              {/* Geographic */}
              <div>
                <h4 className="text-xs font-semibold text-purple-400 mb-2">4. Geographic Context</h4>
                <div className="space-y-2">
                  <CheckItem label="Project location verified" checked={checklist.geo_loc} onChange={() => handleToggle('geo_loc')} />
                  <CheckItem label="North orientation & map alignment verified" checked={checklist.geo_north} onChange={() => handleToggle('geo_north')} />
                </div>
              </div>
            </div>
          </div>

          {/* Summary panel */}
          <div className="w-full md:w-80 bg-slate-950/50 p-6 overflow-y-auto flex flex-col">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Review Summary</h3>
            
            <div className="space-y-4 flex-1">
              {/* Validation Status */}
              <div className={`p-3 rounded border ${isValid ? 'bg-emerald-950/30 border-emerald-900' : 'bg-rose-950/30 border-rose-900'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isValid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-rose-500" />}
                  <span className={`text-sm font-bold ${isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isValid ? 'GEOS Validation Passed' : 'Validation Failed'}
                  </span>
                </div>
                {!isValid && (
                  <ul className="mt-2 text-xs text-rose-300 space-y-1 pl-4 list-disc">
                    {validationResult?.errors?.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {(validationResult?.errors?.length || 0) > 3 && (
                      <li>...and {(validationResult.errors.length - 3)} more errors</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Total Plots</span>
                  <span className="font-bold text-white">{plots.length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Total Roads</span>
                  <span className="font-bold text-white">{roads.length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400">OCR Corrections</span>
                  <span className="font-bold text-amber-400">{ocrCorrectedCount}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Georeference</span>
                  <span className={`font-bold ${georef?.status === 'CONFIGURED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {georef?.status || 'UNCONFIGURED'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              {!isReady && (
                <div className="text-xs text-amber-400 mb-3 text-center font-medium flex items-center justify-center gap-1">
                  <AlertTriangle size={14} /> 
                  {!allChecked ? 'Complete checklist to approve.' : 'Fix validation errors to approve.'}
                </div>
              )}
              
              <button
                onClick={onApprove}
                disabled={!isReady || isApproving}
                className={`w-full py-2.5 rounded font-bold transition-all flex items-center justify-center gap-2 ${
                  isReady && !isApproving
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isApproving ? (
                  <span className="animate-pulse">Freezing Geometry...</span>
                ) : (
                  <>
                    <FileCheck size={18} />
                    Approve Layout
                  </>
                )}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label onClick={onChange} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer group transition-colors">
      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
        checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-500'
      }`}>
        {checked && <CheckCircle2 size={14} className="text-slate-900" />}
      </div>
      <span className={`text-sm select-none ${checked ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-300'}`}>
        {label}
      </span>
    </label>
  );
}
