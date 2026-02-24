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

export interface GridInstance<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRows: () => Row<TData>[];
}
