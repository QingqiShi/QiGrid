export type BuiltInAggFunc = "sum" | "avg" | "count" | "min" | "max" | "first" | "last";
export type AggFunc = BuiltInAggFunc | ((values: unknown[]) => unknown);

export interface ColumnDef<TData> {
  id: string;
  accessorKey?: keyof TData & string;
  accessorFn?: (row: TData) => unknown;
  header: string;
  filterFn?: (value: unknown, filterValue: unknown) => boolean;
  sortingFn?: (a: unknown, b: unknown) => number;
  aggFunc?: AggFunc;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface ColumnSort {
  columnId: string;
  direction: "asc" | "desc";
}

export type SortingState = ColumnSort[];

export interface ColumnFilter {
  columnId: string;
  value: unknown;
}

export type ColumnFiltersState = ColumnFilter[];

export type GroupDisplayType = "groupRows" | "singleColumn" | "multipleColumns";

export interface Column<TData> {
  id: string;
  accessorKey: (keyof TData & string) | undefined;
  accessorFn: ((row: TData) => unknown) | undefined;
  header: string;
  getValue: (row: TData) => unknown;
  filterFn: ((value: unknown, filterValue: unknown) => boolean) | undefined;
  sortingFn: ((a: unknown, b: unknown) => number) | undefined;
  aggFunc: ((values: unknown[]) => unknown) | undefined;
  width: number;
  minWidth: number;
  maxWidth: number;
  groupFor?: string;
}

export interface GridOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  columnFilters?: ColumnFiltersState;
  sorting?: SortingState;
  grouping?: GroupingState;
}

export interface Row<TData> {
  index: number;
  original: TData;
  getValue: (columnId: string) => unknown;
}

export interface LeafRow<TData> {
  type: "leaf";
  index: number;
  original: TData;
  getValue: (columnId: string) => unknown;
}

export interface GroupRow {
  type: "group";
  index: number;
  groupId: string;
  columnId: string;
  groupValue: unknown;
  depth: number;
  leafCount: number;
  isExpanded: boolean;
  aggregatedValues: Record<string, unknown>;
}

export type GridRow<TData> = LeafRow<TData> | GroupRow;

export interface GroupNode<TData> {
  columnId: string;
  groupValue: unknown;
  groupId: string;
  rows: Row<TData>[];
  children: GroupNode<TData>[];
}

export type GroupedRows<TData> = GroupNode<TData>[];

export type GroupingState = string[];

export interface VirtualRange {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetTop: number;
}

export interface VirtualRangeParams {
  totalRowCount: number;
  scrollTop: number;
  containerHeight: number;
  rowHeight: number;
  overscan?: number;
  bufferSize?: number;
}
