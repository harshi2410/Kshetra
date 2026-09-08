import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export function GeometryValidationOverlay({ validationResult }) {
  if (!validationResult) return null;

  const { isValid, errors = [], warnings = [] } = validationResult;

  if (isValid && warnings.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 max-w-md bg-slate-900/90 backdrop-blur border border-amber-500/40 rounded-lg p-3 text-xs shadow-xl text-white z-20 pointer-events-auto">
      <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-400">
        <ShieldAlert size={16} />
        <span>Real-Time GEOS Topology Validation</span>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 mb-2 text-rose-300">
          {errors.slice(0, 3).map((err, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-rose-500 font-bold">•</span>
              <span>{err}</span>
            </li>
          ))}
          {errors.length > 3 && <li className="text-slate-400 text-[10px] italic">+ {errors.length - 3} more errors</li>}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1 text-amber-200">
          {warnings.slice(0, 2).map((warn, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-amber-500 font-bold">•</span>
              <span>{warn}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GeometryValidationOverlay;
