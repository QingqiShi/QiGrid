import type { CellCoord } from "@qigrid/core";
import type { RefObject } from "react";
import { useEffect } from "react";

/**
 * Scrolls the grid body so that the focused cell is visible.
 * Adjusts scrollTop when the focused row is above or below the visible window.
 * Skips scrolling for pinned rows (they are always visible).
 */
export function useScrollToFocus(
  focusedCell: CellCoord | null | undefined,
  rowHeight: number,
  rowAreaHeight: number,
  scrollBodyRef: RefObject<HTMLDivElement | null>,
  pinnedTopCount: number = 0,
  bodyRowCount: number = Number.POSITIVE_INFINITY,
): void {
  useEffect(() => {
    if (!focusedCell || !scrollBodyRef.current) return;
    // Skip if focused cell is in a pinned section (always visible)
    if (focusedCell.rowIndex < pinnedTopCount) return;
    if (focusedCell.rowIndex >= pinnedTopCount + bodyRowCount) return;
    // Convert global to body-local for scroll calculation
    const bodyLocalIndex = focusedCell.rowIndex - pinnedTopCount;
    const el = scrollBodyRef.current;
    const focusedRowTop = bodyLocalIndex * rowHeight;
    const focusedRowBottom = focusedRowTop + rowHeight;
    const visibleTop = el.scrollTop;
    const visibleBottom = visibleTop + rowAreaHeight;

    if (focusedRowTop < visibleTop) {
      el.scrollTop = focusedRowTop;
    } else if (focusedRowBottom > visibleBottom) {
      el.scrollTop = focusedRowBottom - rowAreaHeight;
    }
  }, [focusedCell, rowHeight, rowAreaHeight, scrollBodyRef, pinnedTopCount, bodyRowCount]);
}
