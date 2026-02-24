import type { GridInstance, GridOptions } from "@qigrid/core";
import { createGrid } from "@qigrid/core";
import { useEffect, useRef, useSyncExternalStore } from "react";

export function useGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const gridRef = useRef<GridInstance<TData> | null>(null);

  if (gridRef.current === null) {
    gridRef.current = createGrid(options);
  }

  const grid = gridRef.current;

  // Subscribe to grid state changes — drives React re-renders.
  useSyncExternalStore(grid.subscribe, grid.getState);

  // Sync options changes to the existing grid instance.
  // When the parent passes new data/columns by reference, push them
  // into the grid rather than recreating the instance.
  useEffect(() => {
    if (grid.getState().data !== options.data) {
      grid.setData(options.data);
    }
  }, [grid, options.data]);

  useEffect(() => {
    if (grid.getState().columns !== options.columns) {
      grid.setColumns(options.columns);
    }
  }, [grid, options.columns]);

  return grid;
}
