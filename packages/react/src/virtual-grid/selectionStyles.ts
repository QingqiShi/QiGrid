import type { CellRange } from "@qigrid/core";
import { getCellRangeEdges } from "@qigrid/core";
import type { CSSProperties } from "react";
import { SELECTION_BORDER_COLOR } from "./constants";

export function isRowInRanges(rowIndex: number, ranges: CellRange[]): boolean {
  for (const range of ranges) {
    const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    if (rowIndex >= minRow && rowIndex <= maxRow) return true;
  }
  return false;
}

/** Compute selection border styles for a cell known to be in a selection range. */
export function computeCellSelectionBorders(
  rowIndex: number,
  colIndex: number,
  ranges: CellRange[],
): CSSProperties {
  const edges = getCellRangeEdges({ rowIndex, columnIndex: colIndex }, ranges);
  return {
    borderTop: edges.top ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
    borderBottom: edges.bottom ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
    borderLeft: edges.left ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
    borderRight: edges.right ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
  };
}

/** Compute selection border styles for a banner group row known to be selected. */
export function computeGroupRowSelectionBorders(
  rowIndex: number,
  ranges: CellRange[],
): CSSProperties {
  const prevInSelection = isRowInRanges(rowIndex - 1, ranges);
  const nextInSelection = isRowInRanges(rowIndex + 1, ranges);
  return {
    borderTop: !prevInSelection ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
    borderBottom: !nextInSelection ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
    borderLeft: `2px solid ${SELECTION_BORDER_COLOR}`,
    borderRight: `2px solid ${SELECTION_BORDER_COLOR}`,
  };
}
