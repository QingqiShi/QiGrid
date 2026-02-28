import type { CellCoord } from "@qigrid/core";
import type { RefObject } from "react";

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
