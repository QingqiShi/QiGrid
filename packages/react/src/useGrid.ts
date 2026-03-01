import type {
  CellCoord,
  CellRange,
  ColumnDef,
  ColumnFiltersState,
  GridRow,
  GroupDisplayType,
  GroupingState,
  LeafRow,
  Row,
  SortingState,
} from "@qigrid/core";
import {
  applyWidthOverrides,
  buildColumnModel,
  buildGroupColumns,
  collectAllGroupIds,
  computeTotalWidth,
  filterRows,
  flattenGroupedRows,
  groupRows,
  sortRows,
} from "@qigrid/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { EMPTY_SELECTION, gridReducer } from "./gridReducer";
import type { PendingAction, UseGridReturn } from "./types";

export interface UseGridOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
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

  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Stage 1: Build base column model from defs
  const baseColumnModel = useMemo(() => buildColumnModel(columnDefs), [columnDefs]);

  // Stage 1b: Apply width overrides from state to data columns
  const dataColumnModel = useMemo(
    () => applyWidthOverrides(baseColumnModel, state.columnWidths),
    [baseColumnModel, state.columnWidths],
  );

  // Stage 1c: Build auto-generated group columns
  const groupColumns = useMemo(
    () => buildGroupColumns(state.grouping, displayType, dataColumnModel),
    [state.grouping, displayType, dataColumnModel],
  );

  // Stage 1d: Apply width overrides to group columns
  const groupColumnsWithWidths = useMemo(
    () => applyWidthOverrides(groupColumns, state.columnWidths),
    [groupColumns, state.columnWidths],
  );

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

  // Stage 5a: Build group tree (empty when no grouping)
  const groupedTree = useMemo(
    () =>
      state.grouping.length === 0 ? [] : groupRows(sortedRows, state.grouping, baseColumnModel),
    [sortedRows, state.grouping, baseColumnModel],
  );

  // Stage 5b: Flatten (or pass through as LeafRows when no grouping)
  const rows: GridRow<TData>[] = useMemo(() => {
    if (groupedTree.length === 0) {
      // No grouping — wrap sorted rows as LeafRow for uniform GridRow type
      return sortedRows.map<LeafRow<TData>>((row, i) => ({
        type: "leaf",
        index: i,
        original: row.original,
        getValue: row.getValue,
      }));
    }
    return flattenGroupedRows(groupedTree, state.collapsedGroupIds, baseColumnModel);
  }, [groupedTree, sortedRows, state.collapsedGroupIds, baseColumnModel]);

  // Stable updater functions — dispatch is stable per React guarantees.
  // Sort/filter/group dispatches are wrapped in startTransition so React can
  // show stale rows while the pipeline recomputes (concurrent rendering).
  const toggleSort = useCallback((columnId: string) => {
    setPendingAction({ type: "sort", columnId });
    startTransition(() => dispatch({ type: "TOGGLE_SORT", columnId }));
  }, []);

  const setSorting = useCallback((sorting: SortingState) => {
    setPendingAction({ type: "sort" });
    startTransition(() => dispatch({ type: "SET_SORTING", sorting }));
  }, []);

  const setColumnFilter = useCallback((columnId: string, value: unknown) => {
    setPendingAction({ type: "filter", columnId });
    startTransition(() => dispatch({ type: "SET_COLUMN_FILTER", columnId, value }));
  }, []);

  const setColumnFilters = useCallback((filters: ColumnFiltersState) => {
    setPendingAction({ type: "filter" });
    startTransition(() => dispatch({ type: "SET_COLUMN_FILTERS", filters }));
  }, []);

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => dispatch({ type: "SET_COLUMN_WIDTH", columnId, width }),
    [],
  );

  // --- Grouping callbacks ---
  const setGrouping = useCallback((grouping: GroupingState) => {
    setPendingAction({ type: "group" });
    startTransition(() => dispatch({ type: "SET_GROUPING", grouping }));
  }, []);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setPendingAction({ type: "group" });
    startTransition(() => dispatch({ type: "TOGGLE_GROUP_EXPANSION", groupId }));
  }, []);

  const expandAllGroups = useCallback(() => {
    setPendingAction({ type: "group" });
    startTransition(() => dispatch({ type: "EXPAND_ALL_GROUPS" }));
  }, []);

  const collapseAllGroups = useCallback(() => {
    setPendingAction({ type: "group" });
    startTransition(() =>
      dispatch({ type: "COLLAPSE_ALL_GROUPS", allGroupIds: collectAllGroupIds(groupedTree) }),
    );
  }, [groupedTree]);

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

  const startDeselection = useCallback(
    (coord: CellCoord) => dispatch({ type: "START_DESELECTION", coord }),
    [],
  );

  const extendDeselection = useCallback(
    (coord: CellCoord) => dispatch({ type: "EXTEND_DESELECTION", coord }),
    [],
  );

  const endDeselection = useCallback(() => dispatch({ type: "END_DESELECTION" }), []);

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
      isPending,
      pendingAction: isPending ? pendingAction : null,
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
      startDeselection,
      extendDeselection,
      endDeselection,
    }),
    [
      isPending,
      pendingAction,
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
      startDeselection,
      extendDeselection,
      endDeselection,
    ],
  );
}
