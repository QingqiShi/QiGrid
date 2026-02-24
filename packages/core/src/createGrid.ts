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

function defaultFilterFn(value: unknown, filterValue: unknown): boolean {
  if (typeof value === "string" && typeof filterValue === "string") {
    return value.toLowerCase().includes(filterValue.toLowerCase());
  }
  return value === filterValue;
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

function defaultComparator(a: unknown, b: unknown): number {
  const aNullish = isNullish(a);
  const bNullish = isNullish(b);
  if (aNullish && bNullish) return 0;
  if (aNullish) return 1;
  if (bNullish) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  return String(a).localeCompare(String(b));
}

export function createGrid<TData>(options: GridOptions<TData>): GridInstance<TData> {
  const listeners = new Set<Listener>();

  let columnModel = buildColumnModel(options.columns);
  let columnMap = new Map<string, Column<TData>>();
  let columnDefMap = new Map<string, ColumnDef<TData>>();

  function rebuildColumnMap(): void {
    columnMap = new Map<string, Column<TData>>();
    for (const col of columnModel) {
      columnMap.set(col.id, col);
    }
  }

  function rebuildColumnDefMap(defs: ColumnDef<TData>[]): void {
    columnDefMap = new Map<string, ColumnDef<TData>>();
    for (const def of defs) {
      columnDefMap.set(def.id, def);
    }
  }

  // Initial build — state is not yet initialized
  rebuildColumnMap();
  rebuildColumnDefMap(options.columns);

  function resolveColumn(columnId: string): Column<TData> | undefined {
    return columnMap.get(columnId);
  }

  function filterData(data: TData[], filters: ColumnFiltersState): TData[] {
    if (filters.length === 0) {
      return data;
    }
    return data.filter((row) => {
      for (const filter of filters) {
        const col = resolveColumn(filter.columnId);
        if (col === undefined) {
          continue;
        }
        const value = col.getValue(row);
        const def = columnDefMap.get(filter.columnId);
        const fn = def?.filterFn ?? defaultFilterFn;
        if (!fn(value, filter.value)) {
          return false;
        }
      }
      return true;
    });
  }

  function sortRows(rows: Row<TData>[], sorting: SortingState): Row<TData>[] {
    if (sorting.length === 0) return rows;
    const sorted = rows.slice();
    sorted.sort((rowA, rowB) => {
      for (const { columnId, direction } of sorting) {
        const col = resolveColumn(columnId);
        if (col === undefined) continue;
        const a = col.getValue(rowA.original);
        const b = col.getValue(rowB.original);

        // Nulls always sort last, regardless of direction
        const aN = isNullish(a);
        const bN = isNullish(b);
        if (aN && bN) continue;
        if (aN) return 1;
        if (bN) return -1;

        const def = columnDefMap.get(columnId);
        const comparator = def?.sortingFn ?? defaultComparator;
        const result = comparator(a, b);
        if (result !== 0) {
          return direction === "desc" ? -result : result;
        }
      }
      return 0;
    });
    return sorted;
  }

  function buildRowModel(
    data: TData[],
    filters: ColumnFiltersState,
    sorting: SortingState,
  ): Row<TData>[] {
    const filtered = filterData(data, filters);
    const rows = filtered.map((original, index) => ({
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
    return sortRows(rows, sorting);
  }

  const initialFilters = options.columnFilters ?? [];
  const initialSorting = options.sorting ?? [];

  let state: GridState<TData> = {
    data: options.data,
    columns: options.columns,
    columnFilters: initialFilters,
    sorting: initialSorting,
    rowModel: buildRowModel(options.data, initialFilters, initialSorting),
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
      rowModel: buildRowModel(state.data, state.columnFilters, state.sorting),
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
      rebuildColumnDefMap(state.columns);
    }
    if (dataChanged || filtersChanged || sortingChanged) {
      recomputeRowModel();
    }
    notify();
  }

  function setData(data: TData[]): void {
    state = {
      ...state,
      data,
      rowModel: buildRowModel(data, state.columnFilters, state.sorting),
    };
    notify();
  }

  function setColumns(columns: ColumnDef<TData>[]): void {
    columnModel = buildColumnModel(columns);
    state = { ...state, columns };
    rebuildColumnMap();
    rebuildColumnDefMap(columns);
    if (state.columnFilters.length > 0 || state.sorting.length > 0) {
      recomputeRowModel();
    }
    notify();
  }

  function setColumnFilters(filters: ColumnFiltersState): void {
    state = {
      ...state,
      columnFilters: filters,
      rowModel: buildRowModel(state.data, filters, state.sorting),
    };
    notify();
  }

  function setColumnFilter(columnId: string, value: unknown): void {
    const existing = state.columnFilters.filter((f) => f.columnId !== columnId);
    const newFilters =
      value === "" || value === undefined || value === null
        ? existing
        : [...existing, { columnId, value }];
    setColumnFilters(newFilters);
  }

  function setSorting(sorting: SortingState): void {
    state = {
      ...state,
      sorting,
      rowModel: buildRowModel(state.data, state.columnFilters, sorting),
    };
    notify();
  }

  function toggleSort(columnId: string): void {
    const current = state.sorting;
    const existing = current.find((s) => s.columnId === columnId);

    let next: SortingState;
    if (existing === undefined) {
      next = [...current, { columnId, direction: "asc" }];
    } else if (existing.direction === "asc") {
      next = current.map((s) =>
        s.columnId === columnId ? { ...s, direction: "desc" as const } : s,
      );
    } else {
      next = current.filter((s) => s.columnId !== columnId);
    }

    setSorting(next);
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
