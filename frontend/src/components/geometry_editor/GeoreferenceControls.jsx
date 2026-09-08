import React from 'react';

export const GeoreferenceControls = ({ georef, onTransformChange, onReset, onSave, hasChanges }) => {
  if (!georef) return null;
  const transform = georef.layoutTransform || { translateX: 0, translateY: 0, scale: 1, rotation: 0 };

  const handleChange = (field, value) => {
    onTransformChange({
      ...transform,
      [field]: parseFloat(value) || 0
    });
  };

  return (
    <div className="absolute top-16 right-4 z-50 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-4 shadow-xl text-white w-64 pointer-events-auto">
      <h3 className="text-sm font-semibold mb-3 text-slate-200">Geographic Transform</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Translate X</label>
          <input 
            type="number" 
            value={transform.translateX} 
            onChange={(e) => handleChange('translateX', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
          />
        </div>
        
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Translate Y</label>
          <input 
            type="number" 
            value={transform.translateY} 
            onChange={(e) => handleChange('translateY', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block flex justify-between">
            <span>Scale</span>
            <span>{transform.scale.toFixed(3)}x</span>
          </label>
          <input 
            type="range" 
            min="0.1" max="10" step="0.05"
            value={transform.scale} 
            onChange={(e) => handleChange('scale', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block flex justify-between">
            <span>Rotation</span>
            <span>{transform.rotation}°</span>
          </label>
          <input 
            type="range" 
            min="-180" max="180" step="0.5"
            value={transform.rotation} 
            onChange={(e) => handleChange('rotation', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="pt-2 flex gap-2 border-t border-slate-700">
          <button 
            onClick={onReset}
            className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
          >
            Reset
          </button>
          <button 
            onClick={onSave}
            disabled={!hasChanges}
            className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
              hasChanges ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Save Alignment
          </button>
        </div>
      </div>
    </div>
  );
};
