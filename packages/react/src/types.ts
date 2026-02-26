import type {
  CellCoord,
  CellRange,
  Column,
  ColumnDef,
  ColumnFiltersState,
  GridRow,
  GroupDisplayType,
  GroupingState,
  GroupRow,
  LeafRow,
  SortingState,
  VirtualRange,
} from "@qigrid/core";

export interface VirtualGridProps<TData> {
  /** Rows from useGrid (post-filter/sort/group pipeline). */
  rows: GridRow<TData>[];
  /** Resolved column model with effective widths. */
  columns: Column<TData>[];
  /** Total width of all columns. */
  totalWidth: number;
  /** Fixed height of each row in pixels. */
  rowHeight: number;
  /** Height of the scroll container in pixels. */
  containerHeight: number;
  /** Number of extra rows to render above/below the visible window. */
  overscan?: number;
  /** Render prop for data cells (leaf rows only). */
  renderCell: (row: LeafRow<TData>, column: Column<TData>) => React.ReactNode;
  /** Render prop for header cells. */
  renderHeaderCell: (column: Column<TData>) => React.ReactNode;
  /** Optional render prop for filter row cells. */
  renderFilterCell?: (column: Column<TData>) => React.ReactNode;
  /** Group display mode. Defaults to 'groupRows'. */
  groupDisplayType?: GroupDisplayType;
  /** Render prop for group row headers (used in groupRows mode). */
  renderGroupRow?: (row: GroupRow, toggleExpansion: () => void) => React.ReactNode;
  /** Render prop for group cells in singleColumn/multipleColumns modes. */
  renderGroupCell?: (row: GroupRow, column: Column<TData>) => React.ReactNode;
  /** Callback fired when a group expansion is toggled. */
  onToggleGroupExpansion?: (groupId: string) => void;
  /** Callback fired when the visible virtual range changes. */
  onVirtualRangeChange?: (range: VirtualRange) => void;
  /** Defer scroll state updates to React's async batching instead of using
   *  synchronous rendering. Enable this if cell renderers are expensive and
   *  you prefer batched updates over gap-free scrolling. */
  deferScrollUpdates?: boolean;
  /** Callback fired during column resize drag. When provided, resize handles
   *  are rendered on the right edge of each header cell. */
  onColumnResize?: (columnId: string, width: number) => void;

  // --- Selection props ---

  /** Currently focused cell coordinate (from useGrid). */
  focusedCell?: CellCoord | null;
  /** The anchor cell of the current selection (drag origin). */
  selectionAnchor?: CellCoord | null;
  /** Currently selected ranges (from useGrid). */
  selectedRanges?: CellRange[];
  /** Called when a cell is clicked for selection. */
  onCellMouseDown?: (
    coord: CellCoord,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => void;
  /** Called during drag selection as the pointer moves over cells. */
  onCellMouseEnter?: (coord: CellCoord) => void;
  /** Called when the pointer is released after drag selection. */
  onSelectionMouseUp?: () => void;
  /** Called for keyboard events on the grid (arrow keys, etc). */
  onGridKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export interface UseGridReturn<TData> {
  /** Final pipeline output — the rows to render (leaf + group rows). */
  rows: GridRow<TData>[];

  /** Resolved column model with effective widths. */
  columns: Column<TData>[];

  /** Total width of all columns. */
  totalWidth: number;

  /** Current sorting state. */
  sorting: SortingState;

  /** Current column filter state. */
  columnFilters: ColumnFiltersState;

  /** Current grouping state (column IDs to group by). */
  grouping: GroupingState;

  /** Active group display type. */
  groupDisplayType: GroupDisplayType;

  /** Original data reference (useful for "showing X of Y"). */
  data: TData[];

  /** Column definitions as passed in. */
  columnDefs: ColumnDef<TData>[];

  /** Cycle sort on a column: none → asc → desc → none. */
  toggleSort: (columnId: string) => void;

  /** Replace the entire sorting state. */
  setSorting: (sorting: SortingState) => void;

  /** Set or clear the filter for a single column. */
  setColumnFilter: (columnId: string, value: unknown) => void;

  /** Replace the entire column filters state. */
  setColumnFilters: (filters: ColumnFiltersState) => void;

  /** Set the width of a single column (clamped to min/max). */
  setColumnWidth: (columnId: string, width: number) => void;

  /** Replace the grouping state (column IDs to group by). */
  setGrouping: (grouping: GroupingState) => void;

  /** Toggle expansion of a specific group. */
  toggleGroupExpansion: (groupId: string) => void;

  /** Expand all groups. */
  expandAllGroups: () => void;

  /** Collapse all groups. */
  collapseAllGroups: () => void;

  // --- Selection ---

  /** Currently focused cell (rowIndex + columnIndex into rows/columns arrays). */
  focusedCell: CellCoord | null;
  /** The anchor cell of the current selection (drag origin). */
  selectionAnchor: CellCoord | null;
  /** Active selection ranges. */
  selectedRanges: CellRange[];
  /** Focus a cell and select it (clears previous selection). */
  selectCell: (coord: CellCoord) => void;
  /** Extend selection from anchor to target cell. */
  extendSelection: (coord: CellCoord) => void;
  /** Add a new independent selection range (for Ctrl+Click). */
  addRange: (range: CellRange) => void;
  /** Select all cells. */
  selectAll: () => void;
  /** Clear all selection (keep focus if present). */
  clearSelection: () => void;
  /** Move focus by a delta, optionally extending selection. */
  moveFocus: (deltaRow: number, deltaCol: number, extend?: boolean) => void;
}
