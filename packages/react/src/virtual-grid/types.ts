import type { CellCoord, CellRange } from "@qigrid/core";
import type { RefObject } from "react";

/** Pre-computed selection state passed to row/cell sub-components. */
export interface SelectionState {
  focusedCell: CellCoord | null | undefined;
  selectionAnchor: CellCoord | null | undefined;
  ranges: CellRange[];
  hasSelection: boolean;
}

/** Interaction callbacks passed to cell sub-components. */
export interface CellInteraction {
  isDraggingRef: RefObject<boolean>;
  onCellMouseDown?:
    | ((
        coord: CellCoord,
        modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
      ) => void)
    | undefined;
  onCellMouseEnter?: ((coord: CellCoord) => void) | undefined;
}
