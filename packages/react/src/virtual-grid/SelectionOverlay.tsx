import type { CellCoord, CellRange, Column } from "@qigrid/core";
import { isCellInRanges, normalizeRange, subtractRange } from "@qigrid/core";
import type { ReactNode } from "react";
import { memo, useMemo } from "react";
import { SELECTION_BORDER_COLOR } from "./constants";

interface SelectionOverlayProps<TData> {
  ranges: CellRange[];
  columns: Column<TData>[];
  rowHeight: number;
  rowIndexOffset: number;
  sectionRowCount: number;
  selectionAnchor: CellCoord | null | undefined;
  focusedCell: CellCoord | null | undefined;
}

const SELECTION_BG = "rgba(14, 101, 235, 0.08)";

/**
 * Renders selection overlays on top of rows. Each range produces:
 * - A border div covering the full range (continuous, no gaps)
 * - Background fill divs — if the range contains the anchor cell, the
 *   background is split into strips around the anchor (leaving it clear);
 *   otherwise a single full-range background div.
 *
 * All overlays use pointer-events: none so clicks pass through to cells.
 *
 * Selection coordinates are in global space. This component clips ranges
 * to [rowIndexOffset, rowIndexOffset + sectionRowCount - 1] and converts
 * to local Y positions by subtracting rowIndexOffset.
 */
function SelectionOverlayInner<TData>({
  ranges,
  columns,
  rowHeight,
  rowIndexOffset,
  sectionRowCount,
  selectionAnchor,
  focusedCell,
}: SelectionOverlayProps<TData>): ReactNode {
  // Column prefix sums for x positioning
  const colPrefixSums = useMemo(() => {
    const sums = new Array<number>(columns.length + 1);
    sums[0] = 0;
    for (let i = 0; i < columns.length; i++) {
      sums[i + 1] = (sums[i] ?? 0) + (columns[i]?.width ?? 0);
    }
    return sums;
  }, [columns]);

  const sectionEnd = rowIndexOffset + sectionRowCount - 1;

  // Render focused cell indicator (even when no selection ranges exist)
  const focusedOverlay =
    focusedCell != null &&
    focusedCell.rowIndex >= rowIndexOffset &&
    focusedCell.rowIndex <= sectionEnd &&
    focusedCell.columnIndex >= 0 &&
    focusedCell.columnIndex < columns.length ? (
      <div
        className="vgrid-cell--focused"
        data-row-index={focusedCell.rowIndex}
        data-col-index={focusedCell.columnIndex}
        style={{
          position: "absolute",
          left: colPrefixSums[focusedCell.columnIndex] ?? 0,
          top: (focusedCell.rowIndex - rowIndexOffset) * rowHeight,
          width:
            (colPrefixSums[focusedCell.columnIndex + 1] ?? 0) -
            (colPrefixSums[focusedCell.columnIndex] ?? 0),
          height: rowHeight,
          pointerEvents: "none",
          zIndex: 3,
          boxSizing: "border-box",
        }}
      />
    ) : null;

  if (ranges.length === 0) return focusedOverlay;

  // Determine anchor hole for background splitting
  const anchorHole: CellRange | null =
    selectionAnchor && isCellInRanges(selectionAnchor, ranges)
      ? { start: selectionAnchor, end: selectionAnchor }
      : null;

  const overlays: ReactNode[] = [];
  let bgKey = 0;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (!range) continue;
    const nr = normalizeRange(range);

    // Clamp to this section's bounds (global coords)
    const startRow = Math.max(rowIndexOffset, nr.start.rowIndex);
    const endRow = Math.min(sectionEnd, nr.end.rowIndex);
    const startCol = Math.max(0, nr.start.columnIndex);
    const endCol = Math.min(columns.length - 1, nr.end.columnIndex);

    if (startRow > endRow || startCol > endCol) continue;

    const x = colPrefixSums[startCol] ?? 0;
    const width = (colPrefixSums[endCol + 1] ?? 0) - x;
    const y = (startRow - rowIndexOffset) * rowHeight;
    const height = (endRow - startRow + 1) * rowHeight;

    // Border: full range, continuous outline
    overlays.push(
      <div
        key={`border-${i}`}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width,
          height,
          border: `2px solid ${SELECTION_BORDER_COLOR}`,
          pointerEvents: "none",
          zIndex: 2,
          boxSizing: "border-box",
        }}
      />,
    );

    // Background: split around anchor if it falls within this range
    const bgRanges = anchorHole ? subtractRange(nr, anchorHole) : [nr];

    for (const bgRange of bgRanges) {
      const bgNr = normalizeRange(bgRange);
      // Clamp bg ranges to this section too
      const bgStartRow = Math.max(rowIndexOffset, bgNr.start.rowIndex);
      const bgEndRow = Math.min(sectionEnd, bgNr.end.rowIndex);
      const bgStartCol = Math.max(0, bgNr.start.columnIndex);
      const bgEndCol = Math.min(columns.length - 1, bgNr.end.columnIndex);

      if (bgStartRow > bgEndRow || bgStartCol > bgEndCol) continue;

      const bgX = colPrefixSums[bgStartCol] ?? 0;
      const bgW = (colPrefixSums[bgEndCol + 1] ?? 0) - bgX;
      const bgY = (bgStartRow - rowIndexOffset) * rowHeight;
      const bgH = (bgEndRow - bgStartRow + 1) * rowHeight;

      overlays.push(
        <div
          key={`bg-${bgKey++}`}
          style={{
            position: "absolute",
            left: bgX,
            top: bgY,
            width: bgW,
            height: bgH,
            background: SELECTION_BG,
            pointerEvents: "none",
            zIndex: 2,
            boxSizing: "border-box",
          }}
        />,
      );
    }
  }

  return (
    <>
      {focusedOverlay}
      {overlays}
    </>
  );
}

export const SelectionOverlay = memo(SelectionOverlayInner) as typeof SelectionOverlayInner;
