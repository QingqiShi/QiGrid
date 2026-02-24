import type { GridInstance, GridOptions, Row } from "./types";

export function createGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const { data, columns } = options;

  function getRows(): Row<TData>[] {
    return data.map((original, index) => ({ index, original }));
  }

  return {
    data,
    columns,
    getRows,
  };
}
