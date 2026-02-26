import type { Column, ColumnFiltersState } from "./types";

export function defaultFilterFn(value: unknown, filterValue: unknown): boolean {
  if (typeof value === "string" && typeof filterValue === "string") {
    return value.toLowerCase().includes(filterValue.toLowerCase());
  }
  return value === filterValue;
}

/**
 * Update a single column's filter within a ColumnFiltersState.
 * Removes the filter when value is empty/null/undefined.
 * Returns the new state (does not mutate the input).
 */
export function updateColumnFilter(
  current: ColumnFiltersState,
  columnId: string,
  value: unknown,
): ColumnFiltersState {
  const without = current.filter((f) => f.columnId !== columnId);
  if (value === "" || value === undefined || value === null) {
    return without;
  }
  return [...without, { columnId, value }];
}

export function filterRows<TData>(
  data: TData[],
  filters: ColumnFiltersState,
  columns: Column<TData>[],
): TData[] {
  if (filters.length === 0) {
    return data;
  }

  const columnMap = new Map(columns.map((c) => [c.id, c]));

  return data.filter((row) => {
    for (const filter of filters) {
      const col = columnMap.get(filter.columnId);
      if (col === undefined) {
        continue;
      }
      const value = col.getValue(row);
      const fn = col.filterFn ?? defaultFilterFn;
      if (!fn(value, filter.value)) {
        return false;
      }
    }
    return true;
  });
}
