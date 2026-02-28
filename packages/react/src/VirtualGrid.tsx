import { computeVirtualRange, DEFAULT_OVERSCAN, sliceVisibleRows } from "@qigrid/core";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { VirtualGridProps } from "./types";
import { useColumnResize } from "./useColumnResize";
import { BannerGroupRow } from "./virtual-grid/BannerGroupRow";
import { CellGroupRow } from "./virtual-grid/CellGroupRow";
import { EMPTY_RANGES } from "./virtual-grid/constants";
import { GridHeader } from "./virtual-grid/GridHeader";
import { LeafRow } from "./virtual-grid/LeafRow";
import { SelectionOverlay } from "./virtual-grid/SelectionOverlay";
import type { CellInteraction } from "./virtual-grid/types";
import { useDragSelection } from "./virtual-grid/useDragSelection";
import { useScrollToFocus } from "./virtual-grid/useScrollToFocus";

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
    onCellAction,
  } = props;

  const isGroupRowsMode = groupDisplayType === "groupRows";

  // --- Virtualization ---

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

  useEffect(() => {
    rangeChangeRef.current?.(virtualRange);
  }, [virtualRange]);

  // --- Layout ---

  const headerRowHeight = rowHeight;
  const filterRowHeight = renderFilterCell ? rowHeight : 0;
  const stickyHeight = headerRowHeight + filterRowHeight;
  const rowAreaHeight = containerHeight - stickyHeight;

  // --- Column resize ---

  const handleResizePointerDown = useColumnResize(onColumnResize);

  // --- Scroll handler ---

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    if (deferScrollUpdates) {
      setScrollTop(newScrollTop);
    } else {
      flushSync(() => setScrollTop(newScrollTop));
    }
  };

  // --- Selection state ---

  const ranges = selectedRanges ?? EMPTY_RANGES;

  const isDraggingRef = useDragSelection(onSelectionMouseUp);
  const interaction: CellInteraction = useMemo(
    () => ({ isDraggingRef, onCellMouseDown, onCellMouseEnter }),
    [isDraggingRef, onCellMouseDown, onCellMouseEnter],
  );

  // --- Refs & scroll-to-focus ---

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  useScrollToFocus(focusedCell, rowHeight, rowAreaHeight, scrollBodyRef);

  // --- Keyboard: skip events from interactive elements (e.g. filter inputs) ---

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;

      if ((e.key === "Enter" || e.key === " ") && focusedCell && onCellAction) {
        e.preventDefault();
        onCellAction(focusedCell);
        return;
      }

      onGridKeyDown?.(e);
    },
    [onGridKeyDown, focusedCell, onCellAction],
  );

  // --- Render ---

  return (
    // biome-ignore lint/a11y/useSemanticElements: headless grid uses divs intentionally
    <div
      className="vgrid"
      data-testid="virtual-grid"
      ref={gridRef}
      role="grid"
      tabIndex={0}
      onKeyDown={handleKeyDown}
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
          <GridHeader
            columns={columns}
            totalWidth={totalWidth}
            renderHeaderCell={renderHeaderCell}
            renderFilterCell={renderFilterCell}
            onColumnResize={onColumnResize}
            onResizePointerDown={handleResizePointerDown}
          />

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
            <div
              style={{
                transform: `translateY(${virtualRange.offsetTop - scrollTop}px)`,
                willChange: "transform",
              }}
            >
            {visibleRows.map((row, i) => {
              const offsetY = i * rowHeight;

              if (row.type === "group") {
                if (isGroupRowsMode) {
                  return (
                    <BannerGroupRow
                      key={row.groupId}
                      row={row}
                      totalWidth={totalWidth}
                      rowHeight={rowHeight}
                      offsetY={offsetY}
                      renderGroupRow={renderGroupRow}
                      onToggleGroupExpansion={onToggleGroupExpansion}
                    />
                  );
                }
                return (
                  <CellGroupRow
                    key={row.groupId}
                    row={row}
                    columns={columns}
                    totalWidth={totalWidth}
                    rowHeight={rowHeight}
                    offsetY={offsetY}
                    interaction={interaction}
                    renderGroupCell={renderGroupCell}
                    onToggleGroupExpansion={onToggleGroupExpansion}
                  />
                );
              }

              return (
                <LeafRow
                  key={`leaf-${row.index}`}
                  row={row}
                  columns={columns}
                  totalWidth={totalWidth}
                  rowHeight={rowHeight}
                  offsetY={offsetY}
                  interaction={interaction}
                  renderCell={renderCell}
                />
              );
            })}
            </div>
            <SelectionOverlay
              ranges={ranges}
              columns={columns}
              rowHeight={rowHeight}
              scrollTop={scrollTop}
              totalRowCount={rows.length}
              selectionAnchor={selectionAnchor}
              focusedCell={focusedCell}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
