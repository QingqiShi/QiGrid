import type { ColumnDef, Row, SortingState } from "./types";
import { isNullish } from "./utils";

export function defaultComparator(a: unknown, b: unknown): number {
  const aNullish = isNullish(a);
  const bNullish = isNullish(b);
  if (aNullish && bNullish) return 0;
  if (aNullish) return 1;
  if (bNullish) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  return String(a).localeCompare(String(b));
}

export function sortRows<TData>(
  rows: Row<TData>[],
  sorting: SortingState,
  columnDefs: ColumnDef<TData>[],
): Row<TData>[] {
  if (sorting.length === 0) return rows;

  const defMap = new Map(columnDefs.map((d) => [d.id, d]));
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

      const def = defMap.get(columnId);
      const comparator = def?.sortingFn ?? defaultComparator;
      const result = comparator(a, b);
      if (result !== 0) {
        return direction === "desc" ? -result : result;
      }
    }
    return 0;
  });
  return sorted;
}
