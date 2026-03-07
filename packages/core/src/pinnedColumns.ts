import type { Column } from "./types";

export interface ColumnPinMeta {
  pin: "left" | "right" | undefined;
  stickyOffset: number;
  isLastPinLeft: boolean;
  isFirstPinRight: boolean;
}

/**
 * Reorder columns so that pinned-left come first, then unpinned, then pinned-right.
 * Preserves original order within each group.
 * Returns same reference if no columns are pinned (fast path).
 */
export function reorderColumnsForPinning<TData>(columns: Column<TData>[]): Column<TData>[] {
  let hasPin = false;
  for (const col of columns) {
    if (col.pin) {
      hasPin = true;
      break;
    }
  }
  if (!hasPin) return columns;

  const left: Column<TData>[] = [];
  const center: Column<TData>[] = [];
  const right: Column<TData>[] = [];

  for (const col of columns) {
    if (col.pin === "left") left.push(col);
    else if (col.pin === "right") right.push(col);
    else center.push(col);
  }

  return [...left, ...center, ...right];
}

/**
 * Compute sticky offsets and boundary flags for display-order columns.
 * Left-pinned columns get cumulative offsets from the left edge.
 * Right-pinned columns get cumulative offsets from the right edge.
 */
export function computePinOffsets<TData>(columns: Column<TData>[]): ColumnPinMeta[] {
  const result: ColumnPinMeta[] = new Array(columns.length);

  // Find boundary indices
  let lastLeftIndex = -1;
  let firstRightIndex = columns.length;
  for (let i = 0; i < columns.length; i++) {
    if (columns[i]?.pin === "left") lastLeftIndex = i;
  }
  for (let i = columns.length - 1; i >= 0; i--) {
    if (columns[i]?.pin === "right") firstRightIndex = i;
  }

  // Left-pinned: cumulative from left
  let leftOffset = 0;
  for (let i = 0; i <= lastLeftIndex; i++) {
    const col = columns[i] as Column<TData>;
    if (col.pin === "left") {
      result[i] = {
        pin: "left",
        stickyOffset: leftOffset,
        isLastPinLeft: i === lastLeftIndex,
        isFirstPinRight: false,
      };
      leftOffset += col.width;
    }
  }

  // Right-pinned: cumulative from right
  let rightOffset = 0;
  for (let i = columns.length - 1; i >= firstRightIndex; i--) {
    const col = columns[i] as Column<TData>;
    if (col.pin === "right") {
      result[i] = {
        pin: "right",
        stickyOffset: rightOffset,
        isLastPinLeft: false,
        isFirstPinRight: i === firstRightIndex,
      };
      rightOffset += col.width;
    }
  }

  // Unpinned columns
  for (let i = 0; i < columns.length; i++) {
    if (!result[i]) {
      result[i] = {
        pin: undefined,
        stickyOffset: 0,
        isLastPinLeft: false,
        isFirstPinRight: false,
      };
    }
  }

  return result;
}
