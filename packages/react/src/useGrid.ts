import type {
  CellCoord,
  CellRange,
  ColumnFiltersState,
  GridOptions,
  Row,
  SortingState,
} from "@qigrid/core";
import { buildColumnModel, computeTotalWidth, filterRows, sortRows } from "@qigrid/core";
import { useCallback, useMemo, useReducer } from "react";
import { EMPTY_SELECTION, gridReducer } from "./gridReducer";
import type { UseGridReturn } from "./types";

export function useGrid<TData>(options: GridOptions<TData>): UseGridReturn<TData> {
  const { data, columns: columnDefs } = options;

  const [state, dispatch] = useReducer(gridReducer, {
    sorting: options.sorting ?? [],
    columnFilters: options.columnFilters ?? [],
    columnWidths: {},
    ...EMPTY_SELECTION,
  });

  // Stage 1: Build base column model from defs
  const baseColumnModel = useMemo(() => buildColumnModel(columnDefs), [columnDefs]);

  // Stage 1b: Apply width overrides from state, prune stale entries
  const columnModel = useMemo(() => {
    const columnIds = new Set(baseColumnModel.map((c) => c.id));

    // Check if any overrides exist for current columns
    let hasOverrides = false;
    for (const id of Object.keys(state.columnWidths)) {
      if (columnIds.has(id)) {
        hasOverrides = true;
        break;
      }
    }

    if (!hasOverrides) return baseColumnModel;

    return baseColumnModel.map((col) => {
      const override = state.columnWidths[col.id];
      if (override === undefined) return col;
      const clampedWidth = Math.min(Math.max(override, col.minWidth), col.maxWidth);
      if (clampedWidth === col.width) return col;
      return { ...col, width: clampedWidth };
    });
  }, [baseColumnModel, state.columnWidths]);

  // Stage 1c: Total width
  const totalWidth = useMemo(() => computeTotalWidth(columnModel), [columnModel]);

  // Stage 2: Filtered data (uses baseColumnModel to avoid re-filtering on width changes)
  const filteredData = useMemo(
    () => filterRows(data, state.columnFilters, baseColumnModel),
    [data, state.columnFilters, baseColumnModel],
  );

  // Stage 3: Wrap TData[] into Row<TData>[] with getValue closures
  const rowsBeforeSort = useMemo(() => {
    const colMap = new Map(baseColumnModel.map((c) => [c.id, c]));
    return filteredData.map<Row<TData>>((original, index) => ({
      index,
      original,
      getValue(columnId: string): unknown {
        return colMap.get(columnId)?.getValue(original);
      },
    }));
  }, [filteredData, baseColumnModel]);

  // Stage 4: Sort
  const rows = useMemo(
    () => sortRows(rowsBeforeSort, state.sorting, baseColumnModel),
    [rowsBeforeSort, state.sorting, baseColumnModel],
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

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => dispatch({ type: "SET_COLUMN_WIDTH", columnId, width }),
    [],
  );

  // --- Selection callbacks ---
  const selectCell = useCallback(
    (coord: CellCoord) => dispatch({ type: "SELECT_CELL", coord }),
    [],
  );

  const extendSelection = useCallback(
    (coord: CellCoord) => dispatch({ type: "EXTEND_SELECTION", coord }),
    [],
  );

  const addRange = useCallback((range: CellRange) => dispatch({ type: "ADD_RANGE", range }), []);

  const selectAll = useCallback(
    () => dispatch({ type: "SELECT_ALL", rowCount: rows.length, colCount: columnModel.length }),
    [rows.length, columnModel.length],
  );

  const clearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), []);

  const moveFocus = useCallback(
    (deltaRow: number, deltaCol: number, extend = false) =>
      dispatch({
        type: "MOVE_FOCUS",
        deltaRow,
        deltaCol,
        extend,
        rowCount: rows.length,
        colCount: columnModel.length,
      }),
    [rows.length, columnModel.length],
  );

  return useMemo(
    () => ({
      rows,
      columns: columnModel,
      totalWidth,
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      data,
      columnDefs,
      toggleSort,
      setSorting,
      setColumnFilter,
      setColumnFilters,
      setColumnWidth,
      focusedCell: state.focusedCell,
      selectedRanges: state.selectionRanges,
      selectCell,
      extendSelection,
      addRange,
      selectAll,
      clearSelection,
      moveFocus,
    }),
    [
      rows,
      columnModel,
      totalWidth,
      state.sorting,
      state.columnFilters,
      data,
      columnDefs,
      toggleSort,
      setSorting,
      setColumnFilter,
      setColumnFilters,
      setColumnWidth,
      state.focusedCell,
      state.selectionRanges,
      selectCell,
      extendSelection,
      addRange,
      selectAll,
      clearSelection,
      moveFocus,
    ],
  );
}
