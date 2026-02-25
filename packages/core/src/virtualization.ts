import type { Row, VirtualRange, VirtualRangeParams } from "./types";

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
  } = params;

  if (totalRowCount <= 0 || rowHeight <= 0) {
    return EMPTY_RANGE;
  }

  const totalHeight = totalRowCount * rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - containerHeight);
  const clampedScrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);

  const firstVisibleRow = Math.floor(clampedScrollTop / rowHeight);
  const visibleCount = Math.ceil(containerHeight / rowHeight);

  const startIndex = Math.max(0, firstVisibleRow - overscan);
  const endIndex = Math.min(totalRowCount, firstVisibleRow + visibleCount + overscan);

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetTop: startIndex * rowHeight,
  };
}

export function sliceVisibleRows<TData>(rows: Row<TData>[], range: VirtualRange): Row<TData>[] {
  return rows.slice(range.startIndex, range.endIndex);
}
