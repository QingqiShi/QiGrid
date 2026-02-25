import type {
  CellCoord,
  CellRange,
  ColumnFiltersState,
  GridOptions,
  Row,
  SortingState,
} from "@qigrid/core";
import { buildColumnModel, clampCell, computeTotalWidth, filterRows, sortRows } from "@qigrid/core";
import { useCallback, useMemo, useReducer } from "react";
import type { GridAction, GridInternalState, UseGridReturn } from "./types";

/** Clear selection fields — used when data pipeline changes invalidate indices. */
const EMPTY_SELECTION = {
  focusedCell: null,
  selectionRanges: [] as CellRange[],
  selectionAnchor: null,
} as const;

function gridReducer(state: GridInternalState, action: GridAction): GridInternalState {
  switch (action.type) {
    // --- Data pipeline actions (clear selection on change) ---
    case "SET_SORTING":
      return { ...state, sorting: action.sorting, ...EMPTY_SELECTION };

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
      return { ...state, sorting: next, ...EMPTY_SELECTION };
    }

    case "SET_COLUMN_FILTERS":
      return { ...state, columnFilters: action.filters, ...EMPTY_SELECTION };

    case "SET_COLUMN_FILTER": {
      const { columnId, value } = action;
      const existing = state.columnFilters.filter((f) => f.columnId !== columnId);
      const newFilters: ColumnFiltersState =
        value === "" || value === undefined || value === null
          ? existing
          : [...existing, { columnId, value }];
      return { ...state, columnFilters: newFilters, ...EMPTY_SELECTION };
    }

    case "SET_COLUMN_WIDTH":
      return {
        ...state,
        columnWidths: { ...state.columnWidths, [action.columnId]: action.width },
      };

    // --- Selection actions ---
    case "SELECT_CELL": {
      const { coord } = action;
      return {
        ...state,
        focusedCell: coord,
        selectionAnchor: coord,
        selectionRanges: [{ start: coord, end: coord }],
      };
    }

    case "EXTEND_SELECTION": {
      const anchor = state.selectionAnchor;
      if (!anchor) return state;
      // Replace the last range with anchor→coord
      const newRange: CellRange = { start: anchor, end: action.coord };
      const prevRanges = state.selectionRanges.length > 1 ? state.selectionRanges.slice(0, -1) : [];
      return {
        ...state,
        focusedCell: action.coord,
        selectionRanges: [...prevRanges, newRange],
      };
    }

    case "ADD_RANGE":
      return {
        ...state,
        focusedCell: action.range.end,
        selectionAnchor: action.range.start,
        selectionRanges: [...state.selectionRanges, action.range],
      };

    case "SELECT_ALL":
      return {
        ...state,
        selectionRanges: [
          {
            start: { rowIndex: 0, columnIndex: 0 },
            end: { rowIndex: action.rowCount - 1, columnIndex: action.colCount - 1 },
          },
        ],
        selectionAnchor: { rowIndex: 0, columnIndex: 0 },
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectionRanges: EMPTY_SELECTION.selectionRanges,
        selectionAnchor: state.focusedCell,
      };

    case "MOVE_FOCUS": {
      const { deltaRow, deltaCol, extend, rowCount, colCount } = action;
      const current = state.focusedCell ?? { rowIndex: 0, columnIndex: 0 };
      const next = clampCell(
        { rowIndex: current.rowIndex + deltaRow, columnIndex: current.columnIndex + deltaCol },
        rowCount,
        colCount,
      );

      if (extend) {
        // Shift+Arrow: extend selection from anchor
        const anchor = state.selectionAnchor ?? next;
        const newRange: CellRange = { start: anchor, end: next };
        const prevRanges =
          state.selectionRanges.length > 1 ? state.selectionRanges.slice(0, -1) : [];
        return {
          ...state,
          focusedCell: next,
          selectionRanges: [...prevRanges, newRange],
        };
      }

      // Simple move: clear selection, set focus
      return {
        ...state,
        focusedCell: next,
        selectionAnchor: next,
        selectionRanges: [{ start: next, end: next }],
      };
    }
  }
}

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
