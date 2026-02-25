import type { ColumnFiltersState, GridOptions, Row, SortingState } from "@qigrid/core";
import { buildColumnModel, filterRows, sortRows } from "@qigrid/core";
import { useCallback, useMemo, useReducer } from "react";
import type { GridAction, GridInternalState, UseGridReturn } from "./types";

function gridReducer(state: GridInternalState, action: GridAction): GridInternalState {
  switch (action.type) {
    case "SET_SORTING":
      return { ...state, sorting: action.sorting };

    case "TOGGLE_SORT": {
      const { columnId } = action;
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
      return { ...state, sorting: next };
    }

    case "SET_COLUMN_FILTERS":
      return { ...state, columnFilters: action.filters };

    case "SET_COLUMN_FILTER": {
      const { columnId, value } = action;
      const existing = state.columnFilters.filter((f) => f.columnId !== columnId);
      const newFilters: ColumnFiltersState =
        value === "" || value === undefined || value === null
          ? existing
          : [...existing, { columnId, value }];
      return { ...state, columnFilters: newFilters };
    }
  }
}

export function useGrid<TData>(options: GridOptions<TData>): UseGridReturn<TData> {
  const { data, columns: columnDefs } = options;

  const [state, dispatch] = useReducer(gridReducer, {
    sorting: options.sorting ?? [],
    columnFilters: options.columnFilters ?? [],
  });

  // Stage 1: Column model
  const columnModel = useMemo(() => buildColumnModel(columnDefs), [columnDefs]);

  // Stage 2: Filtered data
  const filteredData = useMemo(
    () => filterRows(data, state.columnFilters, columnDefs),
    [data, state.columnFilters, columnDefs],
  );

  // Stage 3: Wrap TData[] into Row<TData>[] with getValue closures
  const rowsBeforeSort = useMemo(() => {
    const columnMap = new Map(columnModel.map((c) => [c.id, c]));
    return filteredData.map<Row<TData>>((original, index) => ({
      index,
      original,
      getValue(columnId: string): unknown {
        return columnMap.get(columnId)?.getValue(original);
      },
    }));
  }, [filteredData, columnModel]);

  // Stage 4: Sort
  const rows = useMemo(
    () => sortRows(rowsBeforeSort, state.sorting, columnDefs),
    [rowsBeforeSort, state.sorting, columnDefs],
  );

  // Stable updater functions — dispatch is stable per React guarantees
  const toggleSort = useCallback(
    (columnId: string) => dispatch({ type: "TOGGLE_SORT", columnId }),
    [],
  );

  const setSorting = useCallback(
    (sorting: SortingState) => dispatch({ type: "SET_SORTING", sorting }),
    [],
  );

  const setColumnFilter = useCallback(
    (columnId: string, value: unknown) => dispatch({ type: "SET_COLUMN_FILTER", columnId, value }),
    [],
  );

  const setColumnFilters = useCallback(
    (filters: ColumnFiltersState) => dispatch({ type: "SET_COLUMN_FILTERS", filters }),
    [],
  );

  return useMemo(
    () => ({
      rows,
      columns: columnModel,
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      data,
      columnDefs,
      toggleSort,
      setSorting,
      setColumnFilter,
      setColumnFilters,
    }),
    [
      rows,
      columnModel,
      state.sorting,
      state.columnFilters,
      data,
      columnDefs,
      toggleSort,
      setSorting,
      setColumnFilter,
      setColumnFilters,
    ],
  );
}
