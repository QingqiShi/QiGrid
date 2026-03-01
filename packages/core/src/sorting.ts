import type { Column, Row, SortingState } from "./types";
import { isNullish } from "./utils";

/**
 * Cycle a column's sort through: none → asc → desc → none.
 * Returns the new SortingState (does not mutate the input).
 */
export function cycleSort(current: SortingState, columnId: string, multi?: boolean): SortingState {
  const existing = current.find((s) => s.columnId === columnId);

  if (multi) {
    // Multi mode: append/cycle in-place, preserving other columns
    if (existing === undefined) {
      return [...current, { columnId, direction: "asc" }];
    }
    if (existing.direction === "asc") {
      return current.map((s) =>
        s.columnId === columnId ? { ...s, direction: "desc" as const } : s,
      );
    }
    return current.filter((s) => s.columnId !== columnId);
  }

  // Single mode (default): replace sort with just this column
  if (existing === undefined) {
    return [{ columnId, direction: "asc" }];
  }
  if (current.length === 1) {
    // Only sort — cycle normally
    if (existing.direction === "asc") {
      return [{ columnId, direction: "desc" }];
    }
    return [];
  }
  // Column exists in a multi-sort — clear others, keep this column at current direction
  return [{ columnId, direction: existing.direction }];
}

export function defaultComparator(a: unknown, b: unknown): number {
  const aNullish = isNullish(a);
  const bNullish = isNullish(b);
  if (aNullish && bNullish) return 0;
  if (aNullish) return 1;
  if (bNullish) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  return 0;
}

export function sortRows<TData>(
  rows: Row<TData>[],
  sorting: SortingState,
  columns: Column<TData>[],
): Row<TData>[] {
  if (sorting.length === 0) return rows;

  const columnMap = new Map(columns.map((c) => [c.id, c]));
  const sorted = rows.slice();

  sorted.sort((rowA, rowB) => {
    for (const { columnId, direction } of sorting) {
      const a = rowA.getValue(columnId);
      const b = rowB.getValue(columnId);

      const aN = isNullish(a);
      const bN = isNullish(b);
      if (aN && bN) continue;
      if (aN) return 1;
      if (bN) return -1;

      const col = columnMap.get(columnId);
      const comparator = col?.sortingFn ?? defaultComparator;
      const result = comparator(a, b);
      if (result !== 0) {
        return direction === "desc" ? -result : result;
      }
    }
    return 0;
  });
  return sorted;
}
