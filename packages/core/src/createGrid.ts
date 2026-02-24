import type {
  ColumnDef,
  GridInstance,
  GridOptions,
  GridState,
  Listener,
  Row,
  Unsubscribe,
} from "./types";

function buildRowModel<TData>(data: TData[]): Row<TData>[] {
  return data.map((original, index) => ({ index, original }));
}

export function createGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const listeners = new Set<Listener>();

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
    state = { ...state, ...partial };
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
    state = { ...state, columns };
    notify();
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
    getRows,
    getState,
    setState,
    setData,
    setColumns,
    subscribe,
  };
}
