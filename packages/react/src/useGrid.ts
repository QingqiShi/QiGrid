import type {
  CellCoord,
  CellRange,
  ColumnFiltersState,
  GridRow,
  GroupDisplayType,
  GroupingState,
  GroupRow,
  LeafRow,
  Row,
  SortingState,
} from "@qigrid/core";
import {
  buildColumnModel,
  buildGroupColumns,
  computeTotalWidth,
  filterRows,
  flattenGroupedRows,
  groupRows,
  sortRows,
} from "@qigrid/core";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { EMPTY_SELECTION, gridReducer } from "./gridReducer";
import type { UseGridReturn } from "./types";

export interface UseGridOptions<TData> {
  data: TData[];
  columns: import("@qigrid/core").ColumnDef<TData>[];
  columnFilters?: ColumnFiltersState;
  sorting?: SortingState;
  grouping?: GroupingState;
  groupDisplayType?: GroupDisplayType;
  hideGroupedColumns?: boolean;
}

export function useGrid<TData>(options: UseGridOptions<TData>): UseGridReturn<TData> {
  const { data, columns: columnDefs } = options;
  const displayType: GroupDisplayType = options.groupDisplayType ?? "groupRows";
  const hideGroupedColumns = options.hideGroupedColumns ?? displayType !== "groupRows";

  const [state, dispatch] = useReducer(gridReducer, {
    sorting: options.sorting ?? [],
    columnFilters: options.columnFilters ?? [],
    columnWidths: {},
    grouping: options.grouping ?? [],
    collapsedGroupIds: new Set<string>(),
    ...EMPTY_SELECTION,
  });

  // Stage 1: Build base column model from defs
  const baseColumnModel = useMemo(() => buildColumnModel(columnDefs), [columnDefs]);

  // Stage 1b: Apply width overrides from state to data columns, prune stale entries
  const dataColumnModel = useMemo(() => {
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

  // Stage 1c: Build auto-generated group columns
  const groupColumns = useMemo(
    () => buildGroupColumns(state.grouping, displayType, dataColumnModel),
    [state.grouping, displayType, dataColumnModel],
  );

  // Stage 1d: Apply width overrides to group columns
  const groupColumnsWithWidths = useMemo(() => {
    if (groupColumns.length === 0) return groupColumns;

    let hasOverrides = false;
    for (const col of groupColumns) {
      if (state.columnWidths[col.id] !== undefined) {
        hasOverrides = true;
        break;
      }
    }
    if (!hasOverrides) return groupColumns;

    return groupColumns.map((col) => {
      const override = state.columnWidths[col.id];
      if (override === undefined) return col;
      const clampedWidth = Math.min(Math.max(override, col.minWidth), col.maxWidth);
      if (clampedWidth === col.width) return col;
      return { ...col, width: clampedWidth };
    });
  }, [groupColumns, state.columnWidths]);

  // Stage 1e: Build display column model (group columns + visible data columns)
  const displayColumnModel = useMemo(() => {
    const visibleDataColumns =
      hideGroupedColumns && state.grouping.length > 0
        ? dataColumnModel.filter((c) => !state.grouping.includes(c.id))
        : dataColumnModel;
    if (groupColumnsWithWidths.length === 0) return visibleDataColumns;
    return [...groupColumnsWithWidths, ...visibleDataColumns];
  }, [groupColumnsWithWidths, dataColumnModel, hideGroupedColumns, state.grouping]);

  // Stage 1f: Total width
  const totalWidth = useMemo(() => computeTotalWidth(displayColumnModel), [displayColumnModel]);

  // Clear selection when display column count changes (e.g. display type change)
  const prevColCountRef = useRef(displayColumnModel.length);
  useEffect(() => {
    if (prevColCountRef.current !== displayColumnModel.length) {
      prevColCountRef.current = displayColumnModel.length;
      dispatch({ type: "CLEAR_SELECTION" });
    }
  }, [displayColumnModel.length]);

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
  const sortedRows = useMemo(
    () => sortRows(rowsBeforeSort, state.sorting, baseColumnModel),
    [rowsBeforeSort, state.sorting, baseColumnModel],
  );

  // Stage 5: Group + Flatten (or pass through as-is when no grouping)
  const rows: GridRow<TData>[] = useMemo(() => {
    if (state.grouping.length === 0) {
      // No grouping — wrap sorted rows as LeafRow for uniform GridRow type
      return sortedRows.map<LeafRow<TData>>((row, i) => ({
        type: "leaf",
        index: i,
        original: row.original,
        getValue: row.getValue,
      }));
    }
    const grouped = groupRows(sortedRows, state.grouping, baseColumnModel);
    return flattenGroupedRows(grouped, state.collapsedGroupIds, baseColumnModel);
  }, [sortedRows, state.grouping, state.collapsedGroupIds, baseColumnModel]);

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

  // --- Grouping callbacks ---
  const setGrouping = useCallback(
    (grouping: GroupingState) => dispatch({ type: "SET_GROUPING", grouping }),
    [],
  );

  const toggleGroupExpansion = useCallback(
    (groupId: string) => dispatch({ type: "TOGGLE_GROUP_EXPANSION", groupId }),
    [],
  );

  const expandAllGroups = useCallback(() => dispatch({ type: "EXPAND_ALL_GROUPS" }), []);

  const collapseAllGroups = useCallback(() => {
    const allGroupIds = rows.filter((r): r is GroupRow => r.type === "group").map((r) => r.groupId);
    dispatch({ type: "COLLAPSE_ALL_GROUPS", allGroupIds });
  }, [rows]);

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
    () =>
      dispatch({ type: "SELECT_ALL", rowCount: rows.length, colCount: displayColumnModel.length }),
    [rows.length, displayColumnModel.length],
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
        colCount: displayColumnModel.length,
      }),
    [rows.length, displayColumnModel.length],
  );

  return useMemo(
    () => ({
      rows,
      columns: displayColumnModel,
      totalWidth,
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      grouping: state.grouping,
      groupDisplayType: displayType,
      data,
      columnDefs,
      toggleSort,
      setSorting,
      setColumnFilter,
      setColumnFilters,
      setColumnWidth,
      setGrouping,
      toggleGroupExpansion,
      expandAllGroups,
      collapseAllGroups,
      focusedCell: state.focusedCell,
      selectionAnchor: state.selectionAnchor,
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
      displayColumnModel,
      totalWidth,
      state.sorting,
      state.columnFilters,
      state.grouping,
      displayType,
      data,
      columnDefs,
      toggleSort,
      setSorting,
      setColumnFilter,
      setColumnFilters,
      setColumnWidth,
      setGrouping,
      toggleGroupExpansion,
      expandAllGroups,
      collapseAllGroups,
      state.focusedCell,
      state.selectionAnchor,
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
