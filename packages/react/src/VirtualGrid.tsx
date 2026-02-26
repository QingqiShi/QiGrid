import type { CellRange, GridRow } from "@qigrid/core";
import {
  computeVirtualRange,
  DEFAULT_OVERSCAN,
  getCellRangeEdges,
  isCellInRanges,
  sliceVisibleRows,
} from "@qigrid/core";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { VirtualGridProps } from "./types";
import { useColumnResize } from "./useColumnResize";

const EMPTY_RANGES: CellRange[] = [];
const SELECTION_BORDER_COLOR = "rgba(14, 101, 235, 0.8)";

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
    renderGroupRow,
    onToggleGroupExpansion,
    onVirtualRangeChange,
    deferScrollUpdates,
    onColumnResize,
    focusedCell,
    selectionAnchor,
    selectedRanges,
    onCellMouseDown,
    onCellMouseEnter,
    onSelectionMouseUp,
    onGridKeyDown,
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

  const handleResizePointerDown = useColumnResize(onColumnResize);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    if (deferScrollUpdates) {
      setScrollTop(newScrollTop);
    } else {
      flushSync(() => setScrollTop(newScrollTop));
    }
  };

  const rowAreaHeight = containerHeight - stickyHeight;

  // Selection helpers
  const ranges = selectedRanges ?? EMPTY_RANGES;
  const hasSelection = ranges.length > 0;

  const getCellSelectionStyle = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!hasSelection) return undefined;
      if (!isCellInRanges({ rowIndex, columnIndex: colIndex }, ranges)) return undefined;

      const edges = getCellRangeEdges({ rowIndex, columnIndex: colIndex }, ranges);
      return {
        borderTop: edges.top ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
        borderBottom: edges.bottom ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
        borderLeft: edges.left ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
        borderRight: edges.right ? `2px solid ${SELECTION_BORDER_COLOR}` : undefined,
      };
    },
    [hasSelection, ranges],
  );

  // Track drag state in a ref to avoid re-renders
  const isDraggingRef = useRef(false);

  // Document-level pointerup listener for ending drag selection
  useEffect(() => {
    if (!onSelectionMouseUp) return;
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onSelectionMouseUp();
      }
    };
    document.addEventListener("pointerup", handleMouseUp);
    return () => document.removeEventListener("pointerup", handleMouseUp);
  }, [onSelectionMouseUp]);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // Scroll-to-focus: when focusedCell changes, scroll so the focused row is visible
  useEffect(() => {
    if (!focusedCell || !scrollBodyRef.current) return;
    const el = scrollBodyRef.current;
    const focusedRowTop = focusedCell.rowIndex * rowHeight;
    const focusedRowBottom = focusedRowTop + rowHeight;
    // Visible data window starts after sticky header
    const visibleTop = el.scrollTop;
    const visibleBottom = visibleTop + rowAreaHeight;

    if (focusedRowTop < visibleTop) {
      // Focused cell is above the visible area — scroll up
      el.scrollTop = focusedRowTop;
    } else if (focusedRowBottom > visibleBottom) {
      // Focused cell is below the visible area — scroll down
      el.scrollTop = focusedRowBottom - rowAreaHeight;
    }
  }, [focusedCell, rowHeight, rowAreaHeight]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: headless grid uses divs intentionally
    <div
      className="vgrid"
      data-testid="virtual-grid"
      ref={gridRef}
      role="grid"
      tabIndex={0}
      onKeyDown={onGridKeyDown}
      style={{ outline: "none" }}
    >
      <div
        ref={scrollBodyRef}
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
                  style={{
                    width: col.width,
                    flexShrink: 0,
                    ...(onColumnResize ? { position: "relative" as const } : undefined),
                  }}
                >
                  {renderHeaderCell(col)}
                  {onColumnResize && (
                    <div
                      className="vgrid-resize-handle"
                      data-testid={`resize-handle-${col.id}`}
                      onPointerDown={(e) => handleResizePointerDown(col.id, col.width, e)}
                    />
                  )}
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
            {visibleRows.map((row, i) => {
              if (row.type === "group") {
                return (
                  <div
                    key={row.groupId}
                    className="vgrid-row vgrid-group-row"
                    data-row-index={row.index}
                    data-group-id={row.groupId}
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
                    <div className="vgrid-group-cell" style={{ width: totalWidth, flexShrink: 0 }}>
                      {renderGroupRow
                        ? renderGroupRow(row, () => onToggleGroupExpansion?.(row.groupId))
                        : `${row.groupValue} (${row.leafCount})`}
                    </div>
                  </div>
                );
              }

              // Leaf row
              return (
                <div
                  key={`leaf-${row.index}`}
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
                  {columns.map((col, colIndex) => {
                    const isFocused =
                      focusedCell != null &&
                      focusedCell.rowIndex === row.index &&
                      focusedCell.columnIndex === colIndex;
                    const isSelected =
                      hasSelection &&
                      isCellInRanges({ rowIndex: row.index, columnIndex: colIndex }, ranges);
                    const isAnchor =
                      selectionAnchor != null &&
                      selectionAnchor.rowIndex === row.index &&
                      selectionAnchor.columnIndex === colIndex &&
                      isSelected;
                    const selStyle = getCellSelectionStyle(row.index, colIndex);
                    const className = `vgrid-cell${isFocused ? " vgrid-cell--focused" : ""}${isSelected ? " vgrid-cell--selected" : ""}${isAnchor ? " vgrid-cell--anchor" : ""}`;

                    return (
                      <div
                        key={col.id}
                        className={className}
                        style={{ width: col.width, flexShrink: 0, ...selStyle }}
                        onPointerDown={(e) => {
                          if (!onCellMouseDown) return;
                          isDraggingRef.current = true;
                          onCellMouseDown(
                            { rowIndex: row.index, columnIndex: colIndex },
                            { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey },
                          );
                        }}
                        onPointerEnter={() => {
                          if (!onCellMouseEnter || !isDraggingRef.current) return;
                          onCellMouseEnter({ rowIndex: row.index, columnIndex: colIndex });
                        }}
                      >
                        {renderCell(row, col)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
