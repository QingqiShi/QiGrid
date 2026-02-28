import type { CellRange } from "@qigrid/core";

export function isRowInRanges(rowIndex: number, ranges: CellRange[]): boolean {
  for (const range of ranges) {
    const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    if (rowIndex >= minRow && rowIndex <= maxRow) return true;
  }
  return false;
}
