import type { Column, LeafRow as LeafRowType, VirtualRange } from "@qigrid/core";
import { computeVirtualRange, DEFAULT_OVERSCAN, sliceVisibleRows } from "@qigrid/core";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function PinnedSection<TData>({
  rows,
  className,
  keyPrefix,
  height,
  columns,
  totalWidth,
  rowHeight,
  interaction,
  renderCell,
}: {
  rows: LeafRowType<TData>[];
  className: string;
  keyPrefix: string;
  height: number;
  columns: Column<TData>[];
  totalWidth: number;
  rowHeight: number;
  interaction: CellInteraction;
  renderCell: (row: LeafRowType<TData>, column: Column<TData>) => ReactNode;
}) {
  return (
    <div className={className} style={{ height, overflow: "hidden", width: totalWidth }}>
      {rows.map((row, i) => (
        <LeafRow
          key={`${keyPrefix}-${row.index}`}
          row={row}
          columns={columns}
          totalWidth={totalWidth}
          rowHeight={rowHeight}
          offsetY={i * rowHeight}
          interaction={interaction}
          renderCell={renderCell}
        />
      ))}
    </div>
  );
}

export function VirtualGrid<TData>(props: VirtualGridProps<TData>): ReactNode {
  const {
    ref: externalRef,
    rows,
    pinnedTopRows = [],
    pinnedBottomRows = [],
    columns,
    totalWidth,
    rowHeight,
    containerHeight,
    overscan = DEFAULT_OVERSCAN,
    bufferSize,
    renderCell,
    renderHeaderCell,
    renderFilterCell,
    groupDisplayType = "groupRows",
    renderGroupRow,
    renderGroupCell,
    onToggleGroupExpansion,
    onVirtualRangeChange,
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
  useEffect(() => {
    rangeChangeRef.current = onVirtualRangeChange;
  }, [onVirtualRangeChange]);
  const prevRangeRef = useRef<VirtualRange | null>(null);

  const virtualRange = useMemo(() => {
    const params = {
      totalRowCount: rows.length,
      scrollTop,
      containerHeight,
      rowHeight,
      overscan,
      ...(bufferSize != null && { bufferSize }),
    };
    const next = computeVirtualRange(params);
    const prev = prevRangeRef.current;
    if (
      prev &&
      prev.startIndex === next.startIndex &&
      prev.endIndex === next.endIndex &&
      prev.totalHeight === next.totalHeight
    ) {
      return prev;
    }
    prevRangeRef.current = next;
    return next;
  }, [rows.length, scrollTop, containerHeight, rowHeight, overscan, bufferSize]);

  const visibleRows = useMemo(() => sliceVisibleRows(rows, virtualRange), [rows, virtualRange]);

  useEffect(() => {
    rangeChangeRef.current?.(virtualRange);
  }, [virtualRange]);

  // --- Layout ---

  const headerRowHeight = rowHeight;
  const filterRowHeight = renderFilterCell ? rowHeight : 0;
  const stickyHeight = headerRowHeight + filterRowHeight;
  const pinnedTopHeight = pinnedTopRows.length * rowHeight;
  const pinnedBottomHeight = pinnedBottomRows.length * rowHeight;
  const rowAreaHeight = containerHeight - stickyHeight - pinnedTopHeight - pinnedBottomHeight;

  // --- Column resize ---

  const handleResizePointerDown = useColumnResize(onColumnResize);

  // --- Scroll handler ---

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
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

  // Synchronize external ref without replacing the plain ref object on the DOM
  // (callback refs add overhead in React's commit phase).
  const externalRefRef = useRef(externalRef);
  useEffect(() => {
    externalRefRef.current = externalRef;
  }, [externalRef]);
  useEffect(() => {
    const ref = externalRefRef.current;
    const node = gridRef.current;
    if (!ref) return undefined;
    if (typeof ref === "function") {
      ref(node);
      return () => {
        ref(null);
      };
    }
    (ref as { current: HTMLDivElement | null }).current = node;
    return () => {
      (ref as { current: HTMLDivElement | null }).current = null;
    };
  }, []);
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
      {pinnedTopRows.length > 0 && (
        <PinnedSection
          rows={pinnedTopRows}
          className="vgrid-pinned-top"
          keyPrefix="pinned-top"
          height={pinnedTopHeight}
          columns={columns}
          totalWidth={totalWidth}
          rowHeight={rowHeight}
          interaction={interaction}
          renderCell={renderCell}
        />
      )}
      <div
        ref={scrollBodyRef}
        className="vgrid-body"
        onScroll={handleScroll}
        style={{ height: containerHeight - pinnedTopHeight - pinnedBottomHeight, overflow: "auto" }}
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
                transform: `translateY(${-scrollTop}px)`,
                willChange: "transform",
              }}
            >
              {visibleRows.map((row, i) => {
                const offsetY = (virtualRange.startIndex + i) * rowHeight;

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
              <SelectionOverlay
                ranges={ranges}
                columns={columns}
                rowHeight={rowHeight}
                rangeOffsetTop={0}
                totalRowCount={rows.length}
                selectionAnchor={selectionAnchor}
                focusedCell={focusedCell}
              />
            </div>
          </div>
        </div>
      </div>
      {pinnedBottomRows.length > 0 && (
        <PinnedSection
          rows={pinnedBottomRows}
          className="vgrid-pinned-bottom"
          keyPrefix="pinned-bottom"
          height={pinnedBottomHeight}
          columns={columns}
          totalWidth={totalWidth}
          rowHeight={rowHeight}
          interaction={interaction}
          renderCell={renderCell}
        />
      )}
    </div>
  );
}
