import { resolveAggFunc } from "./aggregation";
import type { Column, ColumnDef, GroupDisplayType } from "./types";

const DEFAULT_WIDTH = 150;
const DEFAULT_MIN_WIDTH = 50;
const DEFAULT_MAX_WIDTH = Number.POSITIVE_INFINITY;

export function clampWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(Math.max(width, minWidth), maxWidth);
}

/**
 * Apply width overrides to a column array.
 * Returns the same array reference if no overrides match (memo-friendly).
 */
export function applyWidthOverrides<TData>(
  columns: Column<TData>[],
  widthOverrides: Record<string, number>,
): Column<TData>[] {
  let hasOverrides = false;
  for (const col of columns) {
    if (widthOverrides[col.id] !== undefined) {
      hasOverrides = true;
      break;
    }
  }
  if (!hasOverrides) return columns;

  return columns.map((col) => {
    const override = widthOverrides[col.id];
    if (override === undefined) return col;
    const clamped = clampWidth(override, col.minWidth, col.maxWidth);
    if (clamped === col.width) return col;
    return { ...col, width: clamped };
  });
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
  const aggFunc = def.aggFunc ? resolveAggFunc(def.aggFunc) : undefined;
  const enableAutoSize = def.enableAutoSize ?? true;

  return {
    id,
    accessorKey,
    accessorFn,
    header,
    getValue,
    filterFn,
    sortingFn,
    aggFunc,
    width,
    minWidth,
    maxWidth,
    enableAutoSize,
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

const GROUP_COL_WIDTH = 200;
const GROUP_COL_MIN_WIDTH = 100;
const GROUP_COL_MAX_WIDTH = 600;

const EMPTY_GROUP_COLUMNS: Column<never>[] = [];

export function buildGroupColumns<TData>(
  grouping: string[],
  displayType: GroupDisplayType,
  columns: Column<TData>[],
): Column<TData>[] {
  if (displayType === "groupRows" || grouping.length === 0) {
    return EMPTY_GROUP_COLUMNS as Column<TData>[];
  }

  if (displayType === "singleColumn") {
    return [
      {
        id: "qigrid:group",
        accessorKey: undefined,
        accessorFn: undefined,
        header: "Group",
        getValue: () => undefined,
        filterFn: undefined,
        sortingFn: undefined,
        aggFunc: undefined,
        width: GROUP_COL_WIDTH,
        minWidth: GROUP_COL_MIN_WIDTH,
        maxWidth: GROUP_COL_MAX_WIDTH,
        enableAutoSize: true,
        groupFor: "*",
      },
    ];
  }

  // multipleColumns
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return grouping.map((columnId) => {
    const source = colMap.get(columnId);
    return {
      id: `qigrid:group:${columnId}`,
      accessorKey: undefined,
      accessorFn: undefined,
      header: source?.header ?? columnId,
      getValue: () => undefined,
      filterFn: undefined,
      sortingFn: undefined,
      aggFunc: undefined,
      width: GROUP_COL_WIDTH,
      minWidth: GROUP_COL_MIN_WIDTH,
      maxWidth: GROUP_COL_MAX_WIDTH,
      enableAutoSize: true,
      groupFor: columnId,
    };
  });
}

export function computeAutoSizedWidths<TData>(
  columns: Column<TData>[],
  measuredWidths: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const col of columns) {
    if (!col.enableAutoSize) continue;
    const measured = measuredWidths[col.id];
    if (measured === undefined) continue;
    result[col.id] = clampWidth(measured, col.minWidth, col.maxWidth);
  }
  return result;
}
