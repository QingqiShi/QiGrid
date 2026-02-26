import type { CellRange } from "@qigrid/core";
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

function isRowInRanges(rowIndex: number, ranges: CellRange[]): boolean {
  for (const range of ranges) {
    const minRow = Math.min(range.start.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.start.rowIndex, range.end.rowIndex);
    if (rowIndex >= minRow && rowIndex <= maxRow) return true;
  }
  return false;
}

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
    groupDisplayType = "groupRows",
    renderGroupRow,
    renderGroupCell,
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

  const isGroupRowsMode = groupDisplayType === "groupRows";

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
                    {col.groupFor ? null : renderFilterCell(col)}
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
              const rowTransform = `translateY(${virtualRange.offsetTop - scrollTop + i * rowHeight}px)`;

              if (row.type === "group") {
                // --- Group row in groupRows mode: full-width spanning cell ---
                if (isGroupRowsMode) {
                  const isFocused = focusedCell != null && focusedCell.rowIndex === row.index;
                  const isSelected = hasSelection && isRowInRanges(row.index, ranges);
                  const groupRowClass = `vgrid-row vgrid-group-row vgrid-group-row--banner${isFocused ? " vgrid-group-row--focused" : ""}${isSelected ? " vgrid-group-row--selected" : ""}`;

                  // Compute selection border styles for the full-width group row
                  let groupSelStyle: React.CSSProperties | undefined;
                  if (isSelected) {
                    const prevInSelection = isRowInRanges(row.index - 1, ranges);
                    const nextInSelection = isRowInRanges(row.index + 1, ranges);
                    groupSelStyle = {
                      borderTop: !prevInSelection
                        ? `2px solid ${SELECTION_BORDER_COLOR}`
                        : undefined,
                      borderBottom: !nextInSelection
                        ? `2px solid ${SELECTION_BORDER_COLOR}`
                        : undefined,
                      borderLeft: `2px solid ${SELECTION_BORDER_COLOR}`,
                      borderRight: `2px solid ${SELECTION_BORDER_COLOR}`,
                    };
                  }

                  return (
                    <div
                      key={row.groupId}
                      className={groupRowClass}
                      data-row-index={row.index}
                      data-group-id={row.groupId}
                      style={{
                        display: "flex",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: totalWidth,
                        height: rowHeight,
                        transform: rowTransform,
                        willChange: "transform",
                        ...groupSelStyle,
                      }}
                    >
                      <div
                        className="vgrid-group-cell"
                        style={{ width: totalWidth, flexShrink: 0 }}
                      >
                        {renderGroupRow
                          ? renderGroupRow(row, () => onToggleGroupExpansion?.(row.groupId))
                          : `${row.groupValue} (${row.leafCount})`}
                      </div>
                    </div>
                  );
                }

                // --- Group row in singleColumn/multipleColumns mode: cells per column ---
                return (
                  <div
                    key={row.groupId}
                    className={`vgrid-row vgrid-group-row${row.index % 2 === 0 ? " vgrid-row-even" : ""}`}
                    data-row-index={row.index}
                    data-group-id={row.groupId}
                    style={{
                      display: "flex",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: totalWidth,
                      height: rowHeight,
                      transform: rowTransform,
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

                      // Determine group cell content
                      let cellContent: ReactNode = null;
                      if (col.groupFor) {
                        const isActive = col.groupFor === "*" || col.groupFor === row.columnId;
                        if (isActive) {
                          cellContent = renderGroupCell ? (
                            renderGroupCell(row, col)
                          ) : (
                            <button
                              type="button"
                              className="vgrid-group-toggle"
                              style={{
                                paddingLeft:
                                  col.groupFor === "*" ? `${row.depth * 20}px` : undefined,
                              }}
                              onClick={() => onToggleGroupExpansion?.(row.groupId)}
                            >
                              <span className="group-toggle">
                                {row.isExpanded ? "\u25BE" : "\u25B8"}
                              </span>{" "}
                              {String(row.groupValue)} ({row.leafCount})
                            </button>
                          );
                        }
                      }

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
                          {cellContent}
                        </div>
                      );
                    })}
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
                    transform: rowTransform,
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
                        {col.groupFor ? null : renderCell(row, col)}
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
