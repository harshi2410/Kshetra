import React from 'react';
import { Tag, Compass, Maximize, AlertCircle } from 'lucide-react';

export function GeometryInspectorPanel({ selectedPlot, selectedRoad, onUpdatePlot, onUpdateRoad }) {
  if (!selectedPlot && !selectedRoad) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 text-slate-400 text-xs flex flex-col items-center justify-center text-center">
        <Tag size={28} className="mb-2 text-slate-600" />
        <p className="font-semibold text-slate-300">No Object Selected</p>
        <p className="mt-1 text-slate-500">Click on any plot or road in the editor to inspect and edit its geometry attributes.</p>
      </div>
    );
  }

  if (selectedPlot) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 text-white text-xs overflow-y-auto">
        <h3 className="text-sm font-bold text-emerald-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <Tag size={15} /> Plot Properties
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Plot ID / UUID</label>
            <input type="text" readOnly value={selectedPlot.id || selectedPlot.plotId || ''} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400 font-mono text-[11px]" />
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Plot Number</label>
            <input
              type="text"
              value={selectedPlot.plotNumber || ''}
              onChange={(e) => {
                const newVal = e.target.value;
                const prevVal = selectedPlot.plotNumber || '';
                
                // Track OCR correction internally
                const reviewMeta = selectedPlot.reviewMetadata || {};
                const plotNumReview = reviewMeta.plotNumber || {
                  detectedText: prevVal,
                  reviewedText: prevVal,
                  reviewStatus: "UNREVIEWED"
                };
                
                onUpdatePlot(selectedPlot.id || selectedPlot.plotId, { 
                  plotNumber: newVal,
                  reviewMetadata: {
                    ...reviewMeta,
                    plotNumber: {
                      detectedText: plotNumReview.detectedText || prevVal,
                      reviewedText: newVal,
                      reviewStatus: newVal === (plotNumReview.detectedText || prevVal) ? "VERIFIED" : "CORRECTED"
                    }
                  }
                });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-bold"
            />
            {selectedPlot.reviewMetadata?.plotNumber?.reviewStatus === 'CORRECTED' && (
              <p className="text-[9px] text-amber-500 mt-1">
                Detected: {selectedPlot.reviewMetadata.plotNumber.detectedText || 'N/A'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Facing</label>
              <select
                value={selectedPlot.facing || 'NORTH'}
                onChange={(e) => onUpdatePlot(selectedPlot.id || selectedPlot.plotId, { facing: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
              >
                <option value="NORTH">N</option>
                <option value="SOUTH">S</option>
                <option value="EAST">E</option>
                <option value="WEST">W</option>
                <option value="NE">NE</option>
                <option value="NW">NW</option>
                <option value="SE">SE</option>
                <option value="SW">SW</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">Status</label>
              <select
                value={selectedPlot.status || 'AVAILABLE'}
                onChange={(e) => onUpdatePlot(selectedPlot.id || selectedPlot.plotId, { status: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="SOLD">SOLD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Dimensions</label>
            <input
              type="text"
              value={Array.isArray(selectedPlot.dimensions) ? selectedPlot.dimensions.join(', ') : (selectedPlot.dimensions || '40 x 60')}
              onChange={(e) => onUpdatePlot(selectedPlot.id || selectedPlot.plotId, { dimensions: [e.target.value] })}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
            />
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-400"><span>Calculated Area:</span><span className="font-bold text-white">{Math.round(selectedPlot.area || 0)} sq ft</span></div>
            <div className="flex justify-between text-slate-400"><span>Centroid:</span><span className="font-mono text-slate-300">[{selectedPlot.centroid?.[0] || 0}, {selectedPlot.centroid?.[1] || 0}]</span></div>
            <div className="flex justify-between text-slate-400"><span>Vertices:</span><span className="font-mono text-slate-300">{(selectedPlot.polygon || selectedPlot.geometry || []).length} pts</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 text-white text-xs overflow-y-auto">
      <h3 className="text-sm font-bold text-blue-400 mb-3 border-b border-slate-800 pb-2">Road Properties</h3>
      <div className="space-y-3">
        <div>
          <label className="text-slate-400 font-medium block mb-1">Road Name</label>
          <input
            type="text"
            value={selectedRoad.roadName || ''}
            onChange={(e) => onUpdateRoad(selectedRoad.roadId, { roadName: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-bold"
          />
        </div>
        <div>
          <label className="text-slate-400 font-medium block mb-1">Road Width (ft)</label>
          <input
            type="number"
            value={selectedRoad.roadWidth || selectedRoad.width || 30}
            onChange={(e) => onUpdateRoad(selectedRoad.roadId, { roadWidth: parseFloat(e.target.value) || 30 })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
          />
        </div>
      </div>
    </div>
  );
}

export default GeometryInspectorPanel;
