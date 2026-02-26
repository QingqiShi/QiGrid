import type { CellCoord } from "@qigrid/core";
import type { RefObject } from "react";
import { useEffect } from "react";

/**
 * Scrolls the grid body so that the focused cell is visible.
 * Adjusts scrollTop when the focused row is above or below the visible window.
 */
export function useScrollToFocus(
  focusedCell: CellCoord | null | undefined,
  rowHeight: number,
  rowAreaHeight: number,
  scrollBodyRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    if (!focusedCell || !scrollBodyRef.current) return;
    const el = scrollBodyRef.current;
    const focusedRowTop = focusedCell.rowIndex * rowHeight;
    const focusedRowBottom = focusedRowTop + rowHeight;
    const visibleTop = el.scrollTop;
    const visibleBottom = visibleTop + rowAreaHeight;

    if (focusedRowTop < visibleTop) {
      el.scrollTop = focusedRowTop;
    } else if (focusedRowBottom > visibleBottom) {
      el.scrollTop = focusedRowBottom - rowAreaHeight;
    }
  }, [focusedCell, rowHeight, rowAreaHeight, scrollBodyRef]);
}
