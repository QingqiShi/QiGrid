export interface ColumnDef<TData> {
  id: string;
  accessorKey?: keyof TData & string;
  accessorFn?: (row: TData) => unknown;
  header: string;
}

export interface GridOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
}

export interface Row<TData> {
  index: number;
  original: TData;
}

export interface GridState<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  rowModel: Row<TData>[];
}

export type Listener = () => void;
export type Unsubscribe = () => void;

export interface GridInstance<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRows: () => Row<TData>[];
  getState: () => GridState<TData>;
  setState: (updater: (prev: GridState<TData>) => Partial<GridState<TData>>) => void;
  setData: (data: TData[]) => void;
  setColumns: (columns: ColumnDef<TData>[]) => void;
  subscribe: (listener: Listener) => Unsubscribe;
}
