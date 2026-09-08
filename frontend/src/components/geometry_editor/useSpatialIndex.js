import { useMemo, useCallback } from 'react';

/**
 * Spatial Indexing Hook (TASK-057)
 * Provides bounding-box grid spatial indexing for fast viewport pruning
 * and selection queries supporting 5,000+ plots without rendering bottlenecks.
 */
export function useSpatialIndex(plots = [], cellSize = 500) {
  // Build spatial grid index
  const gridIndex = useMemo(() => {
    const grid = new Map();

    plots.forEach((plot) => {
      const bbox = plot.boundingBox || [0, 0, 100, 100];
      const minKeyX = Math.floor(bbox[0] / cellSize);
      const minKeyY = Math.floor(bbox[1] / cellSize);
      const maxKeyX = Math.floor(bbox[2] / cellSize);
      const maxKeyY = Math.floor(bbox[3] / cellSize);

      for (let gx = minKeyX; gx <= maxKeyX; gx++) {
        for (let gy = minKeyY; gy <= maxKeyY; gy++) {
          const key = `${gx}:${gy}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(plot);
        }
      }
    });

    return grid;
  }, [plots, cellSize]);

  const queryViewportPlots = useCallback((viewBox = [0, 0, 2000, 2000]) => {
    if (!plots || plots.length < 50) return plots; // Skip pruning for small datasets

    const [vx, vy, vw, vh] = viewBox;
    const minKeyX = Math.floor(vx / cellSize);
    const minKeyY = Math.floor(vy / cellSize);
    const maxKeyX = Math.floor((vx + vw) / cellSize);
    const maxKeyY = Math.floor((vy + vh) / cellSize);

    const resultSet = new Set();

    for (let gx = minKeyX; gx <= maxKeyX; gx++) {
      for (let gy = minKeyY; gy <= maxKeyY; gy++) {
        const key = `${gx}:${gy}`;
        const cellPlots = gridIndex.get(key);
        if (cellPlots) {
          cellPlots.forEach((p) => resultSet.add(p));
        }
      }
    }

    return Array.from(resultSet);
  }, [gridIndex, plots, cellSize]);

  return { queryViewportPlots };
}

export default useSpatialIndex;
