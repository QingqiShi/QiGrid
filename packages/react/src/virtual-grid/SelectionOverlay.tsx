import type { CellCoord, CellRange, Column, ColumnPinMeta } from "@qigrid/core";
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
  pinMeta?: ColumnPinMeta[] | undefined;
  scrollLeft?: number | undefined;
  containerWidth?: number | undefined;
}

const SELECTION_BG = "rgba(14, 101, 235, 0.08)";

/**
 * Compute the visual left position of a column, accounting for sticky pinning.
 *
 * - Left-pinned: max(layoutLeft, scrollLeft + stickyOffset)
 * - Right-pinned: min(layoutLeft, scrollLeft + containerWidth - stickyOffset - colWidth)
 * - Unpinned: layoutLeft (from prefix sums)
 */
function colVisualLeft(
  colIndex: number,
  colPrefixSums: number[],
  pinMeta: ColumnPinMeta[] | undefined,
  scrollLeft: number,
  containerWidth: number,
  columns: Column<unknown>[],
): number {
  const layoutLeft = colPrefixSums[colIndex] ?? 0;
  if (!pinMeta) return layoutLeft;
  const meta = pinMeta[colIndex];
  if (!meta?.pin) return layoutLeft;
  if (meta.pin === "left") {
    return Math.max(layoutLeft, scrollLeft + meta.stickyOffset);
  }
  // right
  const colWidth = columns[colIndex]?.width ?? 0;
  return Math.min(layoutLeft, scrollLeft + containerWidth - meta.stickyOffset - colWidth);
}

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
 *
 * When pinMeta is provided, overlay positions are computed using the
 * same sticky logic as CSS (max/min of layout vs scroll position) so
 * they track pinned cells during horizontal scroll.
 */
function SelectionOverlayInner<TData>({
  ranges,
  columns,
  rowHeight,
  rowIndexOffset,
  sectionRowCount,
  selectionAnchor,
  focusedCell,
  pinMeta,
  scrollLeft = 0,
  containerWidth = 0,
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

  /** Compute visual left of a column (sticky-aware). */
  function vLeft(colIndex: number): number {
    return colVisualLeft(
      colIndex,
      colPrefixSums,
      pinMeta,
      scrollLeft,
      containerWidth,
      columns as Column<unknown>[],
    );
  }

  /** Compute visual right edge of a column. */
  function vRight(colIndex: number): number {
    return vLeft(colIndex) + (columns[colIndex]?.width ?? 0);
  }

  const sectionEnd = rowIndexOffset + sectionRowCount - 1;

  // Render focused cell indicator (even when no selection ranges exist)
  let focusedOverlay: ReactNode = null;
  if (
    focusedCell != null &&
    focusedCell.rowIndex >= rowIndexOffset &&
    focusedCell.rowIndex <= sectionEnd &&
    focusedCell.columnIndex >= 0 &&
    focusedCell.columnIndex < columns.length
  ) {
    const ci = focusedCell.columnIndex;
    const fx = vLeft(ci);
    const fw = columns[ci]?.width ?? 0;
    const fy = (focusedCell.rowIndex - rowIndexOffset) * rowHeight;
    focusedOverlay = (
      <div
        className="vgrid-cell--focused"
        data-row-index={focusedCell.rowIndex}
        data-col-index={focusedCell.columnIndex}
        style={{
          position: "absolute",
          left: fx,
          top: fy,
          width: fw,
          height: rowHeight,
          pointerEvents: "none",
          zIndex: 3,
          boxSizing: "border-box",
        }}
      />
    );
  }

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

    const y = (startRow - rowIndexOffset) * rowHeight;
    const height = (endRow - startRow + 1) * rowHeight;

    const x = vLeft(startCol);
    const width = vRight(endCol) - x;

    // Border: continuous outline
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
      const bgStartRow = Math.max(rowIndexOffset, bgNr.start.rowIndex);
      const bgEndRow = Math.min(sectionEnd, bgNr.end.rowIndex);
      const bgStartCol = Math.max(0, bgNr.start.columnIndex);
      const bgEndCol = Math.min(columns.length - 1, bgNr.end.columnIndex);

      if (bgStartRow > bgEndRow || bgStartCol > bgEndCol) continue;

      const bgY = (bgStartRow - rowIndexOffset) * rowHeight;
      const bgH = (bgEndRow - bgStartRow + 1) * rowHeight;

      const bgX = vLeft(bgStartCol);
      const bgW = vRight(bgEndCol) - bgX;

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
