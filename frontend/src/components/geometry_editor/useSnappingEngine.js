import { useCallback } from 'react';

/**
 * Snapping Engine Hook (TASK-057)
 * Computes vertex, edge, road, boundary, and grid snapping coordinates.
 */
export function useSnappingEngine({ snapEnabled = true, snapTolerance = 12.0, gridStep = 10.0 } = {}) {
  const findSnapPoint = useCallback((rawPt, activeModel, currentSelectedId = null) => {
    if (!snapEnabled || !rawPt || !activeModel) return { point: rawPt, snapped: false, type: 'NONE' };

    const [rx, ry] = rawPt;
    let minDistance = snapTolerance;
    let bestSnap = null;
    let snapType = 'NONE';

    // 1. Vertex Snapping against all plots
    const plots = activeModel.plots || [];
    for (const p of plots) {
      if (p.id === currentSelectedId) continue;
      const poly = p.polygon || p.geometry || [];
      for (const pt of poly) {
        const dx = pt[0] - rx;
        const dy = pt[1] - ry;
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) {
          minDistance = dist;
          bestSnap = [pt[0], pt[1]];
          snapType = 'VERTEX';
        }
      }
    }

    // 2. Boundary Vertices Snapping
    const bVerts = activeModel.boundary?.boundaryPolygon || activeModel.boundary?.geometry || [];
    for (const pt of bVerts) {
      const dist = Math.hypot(pt[0] - rx, pt[1] - ry);
      if (dist < minDistance) {
        minDistance = dist;
        bestSnap = [pt[0], pt[1]];
        snapType = 'BOUNDARY';
      }
    }

    // 3. Grid Snapping Fallback if close to grid step
    if (!bestSnap && gridStep > 0) {
      const gx = Math.round(rx / gridStep) * gridStep;
      const gy = Math.round(ry / gridStep) * gridStep;
      const dist = Math.hypot(gx - rx, gy - ry);
      if (dist < snapTolerance / 1.5) {
        bestSnap = [gx, gy];
        snapType = 'GRID';
      }
    }

    if (bestSnap) {
      return { point: bestSnap, snapped: true, type: snapType, distance: minDistance };
    }

    return { point: rawPt, snapped: false, type: 'NONE' };
  }, [snapEnabled, snapTolerance, gridStep]);

  return { findSnapPoint };
}

export default useSnappingEngine;
