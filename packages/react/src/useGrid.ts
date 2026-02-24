import type { GridInstance, GridOptions } from "@qigrid/core";
import { createGrid } from "@qigrid/core";
import { useMemo } from "react";

export function useGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const grid = useMemo(() => createGrid(options), [options]);

  return grid;
}
