import type { CellCoord, CellRange, Column } from "@qigrid/core";
import { isCellInRanges, normalizeRange } from "@qigrid/core";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { SELECTION_BORDER_COLOR } from "./constants";

interface SelectionOverlayProps<TData> {
  ranges: CellRange[];
  columns: Column<TData>[];
  rowHeight: number;
  scrollTop: number;
  totalRowCount: number;
  selectionAnchor: CellCoord | null | undefined;
}

const SELECTION_BG = "rgba(14, 101, 235, 0.08)";

export function SelectionOverlay<TData>({
  ranges,
  columns,
  rowHeight,
  scrollTop,
  totalRowCount,
  selectionAnchor,
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

  if (ranges.length === 0) return null;

  const overlays: ReactNode[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (!range) continue;
    const nr = normalizeRange(range);

    // Clamp to valid bounds
    const startRow = Math.max(0, nr.start.rowIndex);
    const endRow = Math.min(totalRowCount - 1, nr.end.rowIndex);
    const startCol = Math.max(0, nr.start.columnIndex);
    const endCol = Math.min(columns.length - 1, nr.end.columnIndex);

    if (startRow > endRow || startCol > endCol) continue;

    const x = colPrefixSums[startCol] ?? 0;
    const width = (colPrefixSums[endCol + 1] ?? 0) - x;
    const y = startRow * rowHeight - scrollTop;
    const height = (endRow - startRow + 1) * rowHeight;

    overlays.push(
      <div
        key={`range-${i}`}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width,
          height,
          border: `2px solid ${SELECTION_BORDER_COLOR}`,
          background: SELECTION_BG,
          pointerEvents: "none",
          zIndex: 2,
          boxSizing: "border-box",
        }}
      />,
    );
  }

  // Anchor cutout: white rectangle at anchor cell position
  if (selectionAnchor && isCellInRanges(selectionAnchor, ranges)) {
    const anchorCol = selectionAnchor.columnIndex;
    const anchorRow = selectionAnchor.rowIndex;
    if (
      anchorCol >= 0 &&
      anchorCol < columns.length &&
      anchorRow >= 0 &&
      anchorRow < totalRowCount
    ) {
      const x = colPrefixSums[anchorCol] ?? 0;
      const width = (colPrefixSums[anchorCol + 1] ?? 0) - x;
      const y = anchorRow * rowHeight - scrollTop;

      overlays.push(
        <div
          key="anchor-cutout"
          style={{
            position: "absolute",
            left: x,
            top: y,
            width,
            height: rowHeight,
            background: "#fff",
            pointerEvents: "none",
            zIndex: 3,
            boxSizing: "border-box",
          }}
        />,
      );
    }
  }

  return <>{overlays}</>;
}
