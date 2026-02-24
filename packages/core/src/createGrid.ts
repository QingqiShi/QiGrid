import type {
  Column,
  ColumnDef,
  GridInstance,
  GridOptions,
  GridState,
  Listener,
  Row,
  Unsubscribe,
} from "./types";

function buildColumn<TData>(def: ColumnDef<TData>): Column<TData> {
  const { id, accessorKey, accessorFn, header } = def;

  function getValue(row: TData): unknown {
    if (accessorKey !== undefined) {
      return row[accessorKey];
    }
    if (accessorFn !== undefined) {
      return accessorFn(row);
    }
    return undefined;
  }

  return { id, accessorKey, accessorFn, header, getValue };
}

function buildColumnModel<TData>(defs: ColumnDef<TData>[]): Column<TData>[] {
  return defs.map(buildColumn);
}

export function createGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const listeners = new Set<Listener>();

  let columnModel = buildColumnModel(options.columns);
  let columnMap = new Map<string, Column<TData>>();
  rebuildColumnMap();

  function rebuildColumnMap(): void {
    columnMap = new Map<string, Column<TData>>();
    for (const col of columnModel) {
      columnMap.set(col.id, col);
    }
  }

  function resolveColumn(columnId: string): Column<TData> | undefined {
    return columnMap.get(columnId);
  }

  function buildRowModel(data: TData[]): Row<TData>[] {
    return data.map((original, index) => ({
      index,
      original,
      getValue(columnId: string): unknown {
        const col = resolveColumn(columnId);
        if (col === undefined) {
          return undefined;
        }
        return col.getValue(original);
      },
    }));
  }

  let state: GridState<TData> = {
    data: options.data,
    columns: options.columns,
    rowModel: buildRowModel(options.data),
  };

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function getState(): GridState<TData> {
    return state;
  }

  function setState(updater: (prev: GridState<TData>) => Partial<GridState<TData>>): void {
    const partial = updater(state);
    const dataChanged = partial.data !== undefined && partial.data !== state.data;
    const columnsChanged = partial.columns !== undefined && partial.columns !== state.columns;
    state = { ...state, ...partial };
    if (columnsChanged) {
      columnModel = buildColumnModel(state.columns);
      rebuildColumnMap();
    }
    if (dataChanged) {
      state = { ...state, rowModel: buildRowModel(state.data) };
    }
    notify();
  }

  function setData(data: TData[]): void {
    state = { ...state, data, rowModel: buildRowModel(data) };
    notify();
  }

  function setColumns(columns: ColumnDef<TData>[]): void {
    columnModel = buildColumnModel(columns);
    rebuildColumnMap();
    state = { ...state, columns };
    notify();
  }

  function getColumns(): Column<TData>[] {
    return columnModel;
  }

  function getRows(): Row<TData>[] {
    return state.rowModel;
  }

  function subscribe(listener: Listener): Unsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    get data() {
      return state.data;
    },
    get columns() {
      return state.columns;
    },
    getColumns,
    getRows,
    getState,
    setState,
    setData,
    setColumns,
    subscribe,
  };
}
