import { useMemo } from "react";
import { createGrid } from "@qigrid/core";
import type { GridInstance, GridOptions } from "@qigrid/core";

export function useGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const grid = useMemo(
    () => createGrid(options),
    [options],
  );

  return grid;
}
