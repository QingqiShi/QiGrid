import { buildColumnModel } from "./columns";
import { filterRows, updateColumnFilter } from "./filtering";
import { cycleSort, sortRows } from "./sorting";
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  GridInstance,
  GridOptions,
  GridState,
  Listener,
  Row,
  SortingState,
  Unsubscribe,
} from "./types";

export function createGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const listeners = new Set<Listener>();

  let columnModel = buildColumnModel(options.columns);
  let columnMap = new Map<string, Column<TData>>();

  function rebuildColumnMap(): void {
    columnMap = new Map<string, Column<TData>>();
    for (const col of columnModel) {
      columnMap.set(col.id, col);
    }
  }

  // Initial build — state is not yet initialized
  rebuildColumnMap();

  function buildRowModelInternal(
    data: TData[],
    filters: ColumnFiltersState,
    sorting: SortingState,
  ): Row<TData>[] {
    const filtered = filterRows(data, filters, columnModel);
    const rows: Row<TData>[] = filtered.map((original, index) => ({
      index,
      original,
      getValue(columnId: string): unknown {
        const col = columnMap.get(columnId);
        if (col === undefined) {
          return undefined;
        }
        return col.getValue(original);
      },
    }));
    return sortRows(rows, sorting, columnModel);
  }

  const initialFilters = options.columnFilters ?? [];
  const initialSorting = options.sorting ?? [];

  let state: GridState<TData> = {
    data: options.data,
    columns: options.columns,
    columnFilters: initialFilters,
    sorting: initialSorting,
    rowModel: buildRowModelInternal(options.data, initialFilters, initialSorting),
  };

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function getState(): GridState<TData> {
    return state;
  }

  function recomputeRowModel(): void {
    state = {
      ...state,
      rowModel: buildRowModelInternal(state.data, state.columnFilters, state.sorting),
    };
  }

  function setState(updater: (prev: GridState<TData>) => Partial<GridState<TData>>): void {
    const partial = updater(state);
    const dataChanged = partial.data !== undefined && partial.data !== state.data;
    const columnsChanged = partial.columns !== undefined && partial.columns !== state.columns;
    const filtersChanged =
      partial.columnFilters !== undefined && partial.columnFilters !== state.columnFilters;
    const sortingChanged = partial.sorting !== undefined && partial.sorting !== state.sorting;
    state = { ...state, ...partial };
    if (columnsChanged) {
      columnModel = buildColumnModel(state.columns);
      rebuildColumnMap();
    }
    if (dataChanged || columnsChanged || filtersChanged || sortingChanged) {
      recomputeRowModel();
    }
    notify();
  }

  function setData(data: TData[]): void {
    state = {
      ...state,
      data,
      rowModel: buildRowModelInternal(data, state.columnFilters, state.sorting),
    };
    notify();
  }

  function setColumns(columns: ColumnDef<TData>[]): void {
    columnModel = buildColumnModel(columns);
    state = { ...state, columns };
    rebuildColumnMap();
    if (state.columnFilters.length > 0 || state.sorting.length > 0) {
      recomputeRowModel();
    }
    notify();
  }

  function setColumnFilters(filters: ColumnFiltersState): void {
    state = {
      ...state,
      columnFilters: filters,
      rowModel: buildRowModelInternal(state.data, filters, state.sorting),
    };
    notify();
  }

  function setColumnFilter(columnId: string, value: unknown): void {
    setColumnFilters(updateColumnFilter(state.columnFilters, columnId, value));
  }

  function setSorting(sorting: SortingState): void {
    state = {
      ...state,
      sorting,
      rowModel: buildRowModelInternal(state.data, state.columnFilters, sorting),
    };
    notify();
  }

  function toggleSort(columnId: string): void {
    setSorting(cycleSort(state.sorting, columnId));
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
    setColumnFilters,
    setColumnFilter,
    setSorting,
    toggleSort,
    subscribe,
  };
}
