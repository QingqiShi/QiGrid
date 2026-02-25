export interface ColumnDef<TData> {
  id: string;
  accessorKey?: keyof TData & string;
  accessorFn?: (row: TData) => unknown;
  header: string;
  filterFn?: (value: unknown, filterValue: unknown) => boolean;
  sortingFn?: (a: unknown, b: unknown) => number;
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

export interface Column<TData> {
  id: string;
  accessorKey: (keyof TData & string) | undefined;
  accessorFn: ((row: TData) => unknown) | undefined;
  header: string;
  getValue: (row: TData) => unknown;
  width: number;
  minWidth: number;
  maxWidth: number;
}

export interface GridOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  columnFilters?: ColumnFiltersState;
  sorting?: SortingState;
}

export interface Row<TData> {
  index: number;
  original: TData;
  getValue: (columnId: string) => unknown;
}

export interface GridState<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  rowModel: Row<TData>[];
}

export type Listener = () => void;
export type Unsubscribe = () => void;

export interface GridInstance<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getColumns: () => Column<TData>[];
  getRows: () => Row<TData>[];
  getState: () => GridState<TData>;
  setState: (updater: (prev: GridState<TData>) => Partial<GridState<TData>>) => void;
  setData: (data: TData[]) => void;
  setColumns: (columns: ColumnDef<TData>[]) => void;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  setColumnFilter: (columnId: string, value: unknown) => void;
  setSorting: (sorting: SortingState) => void;
  toggleSort: (columnId: string) => void;
  subscribe: (listener: Listener) => Unsubscribe;
}
