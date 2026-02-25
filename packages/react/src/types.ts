import type { Column, ColumnDef, ColumnFiltersState, Row, SortingState } from "@qigrid/core";

export interface UseGridReturn<TData> {
  /** Final pipeline output — the rows to render. */
  rows: Row<TData>[];

  /** Resolved column model with getValue helpers. */
  columns: Column<TData>[];

  /** Current sorting state. */
  sorting: SortingState;

  /** Current column filter state. */
  columnFilters: ColumnFiltersState;

  /** Original data reference (useful for "showing X of Y"). */
  data: TData[];

  /** Column definitions as passed in. */
  columnDefs: ColumnDef<TData>[];

  /** Cycle sort on a column: none → asc → desc → none. */
  toggleSort: (columnId: string) => void;

  /** Replace the entire sorting state. */
  setSorting: (sorting: SortingState) => void;

  /** Set or clear the filter for a single column. */
  setColumnFilter: (columnId: string, value: unknown) => void;

  /** Replace the entire column filters state. */
  setColumnFilters: (filters: ColumnFiltersState) => void;
}

export interface GridInternalState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

export type GridAction =
  | { type: "SET_SORTING"; sorting: SortingState }
  | { type: "TOGGLE_SORT"; columnId: string }
  | { type: "SET_COLUMN_FILTERS"; filters: ColumnFiltersState }
  | { type: "SET_COLUMN_FILTER"; columnId: string; value: unknown };
