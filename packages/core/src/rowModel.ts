import { buildColumnModel } from "./columns";
import { filterRows } from "./filtering";
import { sortRows } from "./sorting";
import type { ColumnDef, ColumnFiltersState, Row, SortingState } from "./types";

export function buildRowModel<TData>(
  data: TData[],
  columnDefs: ColumnDef<TData>[],
  filters: ColumnFiltersState,
  sorting: SortingState,
): Row<TData>[] {
  const columns = buildColumnModel(columnDefs);
  const columnMap = new Map(columns.map((c) => [c.id, c]));

  const filtered = filterRows(data, filters, columnDefs);
  const rows: Row<TData>[] = filtered.map((original, index) => ({
    index,
    original,
    getValue(columnId: string): unknown {
      return columnMap.get(columnId)?.getValue(original);
    },
  }));
  return sortRows(rows, sorting, columnDefs);
}
