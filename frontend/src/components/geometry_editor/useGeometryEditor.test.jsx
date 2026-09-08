import { renderHook, act } from '@testing-library/react';
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import useGeometryEditor from './useGeometryEditor';

describe('useGeometryEditor', () => {
  const initialModel = {
    plots: [
      {
        id: 'plot-1',
        polygon: [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        area: 100,
        centroid: [5, 5]
      }
    ]
  };

  it('updates plot polygon area and centroid accurately using Shoelace', () => {
    const { result } = renderHook(() => useGeometryEditor(initialModel));

    act(() => {
      // Modify polygon to a larger square: 20x20
      result.current.updatePlotPolygon('plot-1', [
        [0, 0], [20, 0], [20, 20], [0, 20], [0, 0]
      ], true);
    });

    const updatedPlot = result.current.model.plots[0];
    expect(updatedPlot.area).toBe(400);
    expect(updatedPlot.centroid).toEqual([10, 10]);
  });

  it('does not push history if isFinal is false', () => {
    const { result } = renderHook(() => useGeometryEditor(initialModel));

    act(() => {
      result.current.updatePlotPolygon('plot-1', [
        [0, 0], [5, 0], [5, 5], [0, 5], [0, 0]
      ], false);
    });

    // We modified it, but we didn't push to history, so undo should not be available
    expect(result.current.canUndo).toBe(false);

    // The model should still reflect the temporary change
    expect(result.current.model.plots[0].area).toBe(25);
  });

  it('pushes history when isFinal is true and supports undo/redo', () => {
    const { result } = renderHook(() => useGeometryEditor(initialModel));

    act(() => {
      result.current.updatePlotPolygon('plot-1', [
        [0, 0], [30, 0], [30, 30], [0, 30], [0, 0]
      ], true);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.model.plots[0].area).toBe(900);

    act(() => {
      result.current.undo();
    });

    expect(result.current.model.plots[0].area).toBe(100);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.model.plots[0].area).toBe(900);
  });
});
