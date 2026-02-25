export interface CellCoord {
  rowIndex: number;
  columnIndex: number;
}

export interface CellRange {
  start: CellCoord;
  end: CellCoord;
}

/**
 * Normalize a range so start ≤ end on both axes.
 */
export function normalizeRange(range: CellRange): CellRange {
  const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
  const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
  const minCol = Math.min(range.start.columnIndex, range.end.columnIndex);
  const maxCol = Math.max(range.start.columnIndex, range.end.columnIndex);
  return {
    start: { rowIndex: minRow, columnIndex: minCol },
    end: { rowIndex: maxRow, columnIndex: maxCol },
  };
}

/**
 * Check if a cell is inside a normalized range (inclusive bounds).
 */
export function isCellInRange(cell: CellCoord, range: CellRange): boolean {
  const n = normalizeRange(range);
  return (
    cell.rowIndex >= n.start.rowIndex &&
    cell.rowIndex <= n.end.rowIndex &&
    cell.columnIndex >= n.start.columnIndex &&
    cell.columnIndex <= n.end.columnIndex
  );
}

/**
 * Check if a cell is inside any of the given ranges.
 */
export function isCellInRanges(cell: CellCoord, ranges: CellRange[]): boolean {
  for (const range of ranges) {
    if (isCellInRange(cell, range)) return true;
  }
  return false;
}

/**
 * Clamp a cell coordinate within valid bounds.
 */
export function clampCell(cell: CellCoord, rowCount: number, colCount: number): CellCoord {
  return {
    rowIndex: Math.max(0, Math.min(cell.rowIndex, rowCount - 1)),
    columnIndex: Math.max(0, Math.min(cell.columnIndex, colCount - 1)),
  };
}

/**
 * Compare two cell coordinates for equality.
 */
export function cellCoordsEqual(a: CellCoord | null, b: CellCoord | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.rowIndex === b.rowIndex && a.columnIndex === b.columnIndex;
}

/**
 * Compare two arrays of cell ranges for equality.
 */
export function rangesEqual(a: CellRange[], b: CellRange[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    if (!ra || !rb) return false;
    if (
      ra.start.rowIndex !== rb.start.rowIndex ||
      ra.start.columnIndex !== rb.start.columnIndex ||
      ra.end.rowIndex !== rb.end.rowIndex ||
      ra.end.columnIndex !== rb.end.columnIndex
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Get the position of a cell relative to a range's edges.
 * Used for rendering range borders (top/right/bottom/left edges).
 */
export function getCellRangeEdges(
  cell: CellCoord,
  ranges: CellRange[],
): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
  let top = false;
  let right = false;
  let bottom = false;
  let left = false;

  for (const range of ranges) {
    const nr = normalizeRange(range);
    if (!isCellInRange(cell, nr)) continue;

    if (cell.rowIndex === nr.start.rowIndex) top = true;
    if (cell.rowIndex === nr.end.rowIndex) bottom = true;
    if (cell.columnIndex === nr.start.columnIndex) left = true;
    if (cell.columnIndex === nr.end.columnIndex) right = true;
  }

  return { top, right, bottom, left };
}

/**
 * Serialize selected cell values to a tab-separated string (TSV).
 * Compatible with Excel/Google Sheets paste.
 */
export function serializeRangeToTSV(
  rows: { getValue: (columnId: string) => unknown }[],
  columnIds: string[],
  range: CellRange,
): string {
  const n = normalizeRange(range);
  const lines: string[] = [];

  for (let r = n.start.rowIndex; r <= n.end.rowIndex; r++) {
    const row = rows[r];
    if (!row) continue;
    const cells: string[] = [];
    for (let c = n.start.columnIndex; c <= n.end.columnIndex; c++) {
      const colId = columnIds[c];
      if (colId === undefined) continue;
      const val = row.getValue(colId);
      cells.push(val == null ? "" : String(val));
    }
    lines.push(cells.join("\t"));
  }

  return lines.join("\n");
}
