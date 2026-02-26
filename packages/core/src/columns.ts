import type { Column, ColumnDef } from "./types";

const DEFAULT_WIDTH = 150;
const DEFAULT_MIN_WIDTH = 50;
const DEFAULT_MAX_WIDTH = Number.POSITIVE_INFINITY;

function clampWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(Math.max(width, minWidth), maxWidth);
}

function buildColumn<TData>(def: ColumnDef<TData>): Column<TData> {
  const { id, accessorKey, accessorFn, header } = def;

  const minWidth = def.minWidth ?? DEFAULT_MIN_WIDTH;
  const maxWidth = def.maxWidth ?? DEFAULT_MAX_WIDTH;
  const width = clampWidth(def.width ?? DEFAULT_WIDTH, minWidth, maxWidth);

  function getValue(row: TData): unknown {
    if (accessorKey !== undefined) {
      return row[accessorKey];
    }
    if (accessorFn !== undefined) {
      return accessorFn(row);
    }
    return undefined;
  }

  const { filterFn, sortingFn } = def;

  return {
    id,
    accessorKey,
    accessorFn,
    header,
    getValue,
    filterFn,
    sortingFn,
    width,
    minWidth,
    maxWidth,
  };
}

export function buildColumnModel<TData>(defs: ColumnDef<TData>[]): Column<TData>[] {
  return defs.map(buildColumn);
}

export function computeTotalWidth<TData>(columns: Column<TData>[]): number {
  let total = 0;
  for (const col of columns) {
    total += col.width;
  }
  return total;
}
