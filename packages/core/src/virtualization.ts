import type { VirtualRange, VirtualRangeParams } from "./types";

export const DEFAULT_OVERSCAN = 5;

const EMPTY_RANGE: VirtualRange = {
  startIndex: 0,
  endIndex: 0,
  totalHeight: 0,
  offsetTop: 0,
};

export function computeVirtualRange(params: VirtualRangeParams): VirtualRange {
  const {
    totalRowCount,
    scrollTop,
    containerHeight,
    rowHeight,
    overscan = DEFAULT_OVERSCAN,
    bufferSize = 0,
  } = params;

  if (totalRowCount <= 0 || rowHeight <= 0) {
    return EMPTY_RANGE;
  }

  const totalHeight = totalRowCount * rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - containerHeight);
  const clampedScrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);

  const rawFirstVisibleRow = Math.floor(clampedScrollTop / rowHeight);
  const visibleCount = Math.ceil(containerHeight / rowHeight);

  const firstVisibleRow =
    bufferSize > 0 ? Math.floor(rawFirstVisibleRow / bufferSize) * bufferSize : rawFirstVisibleRow;

  const startIndex = Math.max(0, firstVisibleRow - overscan);
  const endIndex = Math.min(
    totalRowCount,
    firstVisibleRow + visibleCount + (bufferSize > 0 ? bufferSize : 0) + overscan,
  );

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetTop: startIndex * rowHeight,
  };
}

export function sliceVisibleRows<T>(rows: T[], range: VirtualRange): T[] {
  return rows.slice(range.startIndex, range.endIndex);
}
