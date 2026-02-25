import { computeVirtualRange, DEFAULT_OVERSCAN, sliceVisibleRows } from "@qigrid/core";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { VirtualGridProps } from "./types";

export function VirtualGrid<TData>(props: VirtualGridProps<TData>): ReactNode {
  const {
    rows,
    columns,
    totalWidth,
    rowHeight,
    containerHeight,
    overscan = DEFAULT_OVERSCAN,
    renderCell,
    renderHeaderCell,
    renderFilterCell,
    onVirtualRangeChange,
    deferScrollUpdates,
  } = props;

  const [scrollTop, setScrollTop] = useState(0);
  const rangeChangeRef = useRef(onVirtualRangeChange);
  rangeChangeRef.current = onVirtualRangeChange;

  const virtualRange = useMemo(
    () =>
      computeVirtualRange({
        totalRowCount: rows.length,
        scrollTop,
        containerHeight,
        rowHeight,
        overscan,
      }),
    [rows.length, scrollTop, containerHeight, rowHeight, overscan],
  );

  const visibleRows = useMemo(() => sliceVisibleRows(rows, virtualRange), [rows, virtualRange]);

  // Notify parent when virtual range changes
  useEffect(() => {
    rangeChangeRef.current?.(virtualRange);
  }, [virtualRange]);

  // Compute sticky header height: header row + optional filter row
  const headerRowHeight = rowHeight;
  const filterRowHeight = renderFilterCell ? rowHeight : 0;
  const stickyHeight = headerRowHeight + filterRowHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    if (deferScrollUpdates) {
      setScrollTop(newScrollTop);
    } else {
      flushSync(() => setScrollTop(newScrollTop));
    }
  };

  const rowAreaHeight = containerHeight - stickyHeight;

  return (
    <div className="vgrid" data-testid="virtual-grid">
      <div
        className="vgrid-body"
        onScroll={handleScroll}
        style={{ height: containerHeight, overflow: "auto" }}
      >
        <div
          className="vgrid-spacer"
          style={{
            height: virtualRange.totalHeight + stickyHeight,
            width: totalWidth,
          }}
        >
          <div
            className="vgrid-header"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              width: totalWidth,
            }}
          >
            <div className="vgrid-header-row" style={{ display: "flex" }}>
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="vgrid-header-cell"
                  style={{ width: col.width, flexShrink: 0 }}
                >
                  {renderHeaderCell(col)}
                </div>
              ))}
            </div>
            {renderFilterCell && (
              <div className="vgrid-filter-row" style={{ display: "flex" }}>
                {columns.map((col) => (
                  <div
                    key={`filter-${col.id}`}
                    className="vgrid-filter-cell"
                    style={{ width: col.width, flexShrink: 0 }}
                  >
                    {renderFilterCell(col)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="vgrid-rows"
            style={{
              position: "sticky",
              top: stickyHeight,
              height: rowAreaHeight,
              overflow: "hidden",
              zIndex: 1,
              width: totalWidth,
            }}
          >
            {visibleRows.map((row, i) => (
              <div
                key={row.index}
                className={`vgrid-row${row.index % 2 === 0 ? " vgrid-row-even" : ""}`}
                data-row-index={row.index}
                style={{
                  display: "flex",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: totalWidth,
                  height: rowHeight,
                  transform: `translateY(${virtualRange.offsetTop - scrollTop + i * rowHeight}px)`,
                  willChange: "transform",
                }}
              >
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="vgrid-cell"
                    style={{ width: col.width, flexShrink: 0 }}
                  >
                    {renderCell(row, col)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
