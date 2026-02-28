import type {
  CellCoord,
  CellRange,
  ColumnFiltersState,
  GroupingState,
  SortingState,
} from "@qigrid/core";
import {
  cellCoordsEqual,
  clampCell,
  cycleSort,
  subtractFromRanges,
  updateColumnFilter,
} from "@qigrid/core";

export interface GridInternalState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnWidths: Record<string, number>;
  grouping: GroupingState;
  collapsedGroupIds: Set<string>;
  focusedCell: CellCoord | null;
  selectionRanges: CellRange[];
  /** Internal: the anchor cell from which shift-extend builds a range. */
  selectionAnchor: CellCoord | null;
  /** Snapshot of ranges before deselection drag (for recomputing subtraction). */
  deselectionBaseRanges: CellRange[] | null;
}

export type GridAction =
  | { type: "SET_SORTING"; sorting: SortingState }
  | { type: "TOGGLE_SORT"; columnId: string }
  | { type: "SET_COLUMN_FILTERS"; filters: ColumnFiltersState }
  | { type: "SET_COLUMN_FILTER"; columnId: string; value: unknown }
  | { type: "SET_COLUMN_WIDTH"; columnId: string; width: number }
  | { type: "SET_GROUPING"; grouping: GroupingState }
  | { type: "TOGGLE_GROUP_EXPANSION"; groupId: string }
  | { type: "EXPAND_ALL_GROUPS" }
  | { type: "COLLAPSE_ALL_GROUPS"; allGroupIds: string[] }
  | { type: "SELECT_CELL"; coord: CellCoord }
  | { type: "EXTEND_SELECTION"; coord: CellCoord }
  | { type: "ADD_RANGE"; range: CellRange }
  | { type: "SELECT_ALL"; rowCount: number; colCount: number }
  | { type: "CLEAR_SELECTION" }
  | {
      type: "MOVE_FOCUS";
      deltaRow: number;
      deltaCol: number;
      extend: boolean;
      rowCount: number;
      colCount: number;
    }
  | { type: "START_DESELECTION"; coord: CellCoord }
  | { type: "EXTEND_DESELECTION"; coord: CellCoord }
  | { type: "END_DESELECTION" };

/** Clear selection fields — used when data pipeline changes invalidate indices. */
export const EMPTY_SELECTION = {
  focusedCell: null,
  selectionRanges: [] as CellRange[],
  selectionAnchor: null,
  deselectionBaseRanges: null,
} as const;

export function gridReducer(state: GridInternalState, action: GridAction): GridInternalState {
  switch (action.type) {
    // --- Data pipeline actions (clear selection on change) ---
    case "SET_SORTING":
      return { ...state, sorting: action.sorting, ...EMPTY_SELECTION };

    case "TOGGLE_SORT":
      return { ...state, sorting: cycleSort(state.sorting, action.columnId), ...EMPTY_SELECTION };

    case "SET_COLUMN_FILTERS":
      return { ...state, columnFilters: action.filters, ...EMPTY_SELECTION };

    case "SET_COLUMN_FILTER":
      return {
        ...state,
        columnFilters: updateColumnFilter(state.columnFilters, action.columnId, action.value),
        ...EMPTY_SELECTION,
      };

    case "SET_COLUMN_WIDTH":
      return {
        ...state,
        columnWidths: { ...state.columnWidths, [action.columnId]: action.width },
      };

    // --- Grouping actions (clear selection on change) ---
    case "SET_GROUPING":
      return {
        ...state,
        grouping: action.grouping,
        collapsedGroupIds: new Set(),
        ...EMPTY_SELECTION,
      };

    case "TOGGLE_GROUP_EXPANSION": {
      const next = new Set(state.collapsedGroupIds);
      if (next.has(action.groupId)) {
        next.delete(action.groupId);
      } else {
        next.add(action.groupId);
      }
      return { ...state, collapsedGroupIds: next, ...EMPTY_SELECTION };
    }

    case "EXPAND_ALL_GROUPS":
      return { ...state, collapsedGroupIds: new Set(), ...EMPTY_SELECTION };

    case "COLLAPSE_ALL_GROUPS":
      return { ...state, collapsedGroupIds: new Set(action.allGroupIds), ...EMPTY_SELECTION };

    // --- Selection actions ---
    case "SELECT_CELL": {
      const { coord } = action;
      return {
        ...state,
        focusedCell: coord,
        selectionAnchor: coord,
        selectionRanges: [{ start: coord, end: coord }],
        deselectionBaseRanges: null,
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
        deselectionBaseRanges: null,
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

      const hasMultiCellSelection =
        state.selectionAnchor != null &&
        state.focusedCell != null &&
        !cellCoordsEqual(state.selectionAnchor, state.focusedCell);

      // When collapsing a multi-cell selection, navigate from anchor (Excel behavior).
      // hasMultiCellSelection guarantees selectionAnchor is non-null.
      const origin =
        !extend && hasMultiCellSelection
          ? (state.selectionAnchor as CellCoord)
          : (state.focusedCell ?? { rowIndex: 0, columnIndex: 0 });

      const next = clampCell(
        { rowIndex: origin.rowIndex + deltaRow, columnIndex: origin.columnIndex + deltaCol },
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

    // --- Deselection actions ---
    case "START_DESELECTION": {
      const { coord } = action;
      const hole: CellRange = { start: coord, end: coord };
      return {
        ...state,
        deselectionBaseRanges: state.selectionRanges,
        selectionRanges: subtractFromRanges(state.selectionRanges, hole),
        selectionAnchor: coord,
        focusedCell: coord,
      };
    }

    case "EXTEND_DESELECTION": {
      if (!state.deselectionBaseRanges || !state.selectionAnchor) return state;
      const hole: CellRange = { start: state.selectionAnchor, end: action.coord };
      return {
        ...state,
        selectionRanges: subtractFromRanges(state.deselectionBaseRanges, hole),
        focusedCell: action.coord,
      };
    }

    case "END_DESELECTION":
      return {
        ...state,
        deselectionBaseRanges: null,
      };
  }
}
