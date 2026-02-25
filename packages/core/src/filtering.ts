import { buildColumnModel } from "./columns";
import type { ColumnDef, ColumnFiltersState } from "./types";

export function defaultFilterFn(value: unknown, filterValue: unknown): boolean {
  if (typeof value === "string" && typeof filterValue === "string") {
    return value.toLowerCase().includes(filterValue.toLowerCase());
  }
  return value === filterValue;
}

export function filterRows<TData>(
  data: TData[],
  filters: ColumnFiltersState,
  columnDefs: ColumnDef<TData>[],
): TData[] {
  if (filters.length === 0) {
    return data;
  }

  const columns = buildColumnModel(columnDefs);
  const columnMap = new Map(columns.map((c) => [c.id, c]));
  const defMap = new Map(columnDefs.map((d) => [d.id, d]));

  return data.filter((row) => {
    for (const filter of filters) {
      const col = columnMap.get(filter.columnId);
      if (col === undefined) {
        continue;
      }
      const value = col.getValue(row);
      const def = defMap.get(filter.columnId);
      const fn = def?.filterFn ?? defaultFilterFn;
      if (!fn(value, filter.value)) {
        return false;
      }
    }
    return true;
  });
}
