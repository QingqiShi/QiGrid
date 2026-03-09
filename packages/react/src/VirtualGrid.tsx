import type {
  CellCoord,
  CellRange,
  Column,
  ColumnPinMeta,
  LeafRow as LeafRowType,
  VirtualRange,
} from "@qigrid/core";
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
  stickyTop,
  stickyBottom,
  interaction,
  renderCell,
  selectedRanges,
  selectionAnchor,
  focusedCell,
  rowIndexOffset,
  sectionRowCount,
  pinMeta,
  overlayClipPath,
}: {
  rows: LeafRowType<TData>[];
  className: string;
  keyPrefix: string;
  height: number;
  columns: Column<TData>[];
  totalWidth: number;
  rowHeight: number;
  stickyTop?: number;
  stickyBottom?: number;
  interaction: CellInteraction;
  renderCell: (row: LeafRowType<TData>, column: Column<TData>) => ReactNode;
  selectedRanges: CellRange[];
  selectionAnchor: CellCoord | null | undefined;
  focusedCell: CellCoord | null | undefined;
  rowIndexOffset: number;
  sectionRowCount: number;
  pinMeta?: ColumnPinMeta[] | undefined;
  overlayClipPath?: string | undefined;
}) {
  return (
    <div
      className={className}
      style={{
        position: "sticky",
        ...(stickyTop != null && { top: stickyTop }),
        ...(stickyBottom != null && { bottom: stickyBottom }),
        zIndex: 2,
        height,
        overflowY: "clip",
        overflowX: "visible",
        width: totalWidth,
      }}
    >
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
          pinMeta={pinMeta}
        />
      ))}
      {overlayClipPath ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: totalWidth,
            height,
            pointerEvents: "none",
            clipPath: overlayClipPath,
          }}
        >
          <SelectionOverlay
            ranges={selectedRanges}
            columns={columns}
            rowHeight={rowHeight}
            rowIndexOffset={rowIndexOffset}
            sectionRowCount={sectionRowCount}
            selectionAnchor={selectionAnchor}
            focusedCell={focusedCell}
          />
        </div>
      ) : (
        <SelectionOverlay
          ranges={selectedRanges}
          columns={columns}
          rowHeight={rowHeight}
          rowIndexOffset={rowIndexOffset}
          sectionRowCount={sectionRowCount}
          selectionAnchor={selectionAnchor}
          focusedCell={focusedCell}
        />
      )}
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
    pinMeta,
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

  // --- Overlay clip for pinned columns ---

  const overlayClipPath = useMemo(() => {
    if (!pinMeta) return undefined;
    let leftW = 0;
    let rightW = 0;
    for (let i = 0; i < pinMeta.length; i++) {
      const p = pinMeta[i]?.pin;
      if (p === "left") leftW += columns[i]?.width ?? 0;
      else if (p === "right") rightW += columns[i]?.width ?? 0;
    }
    if (leftW === 0 && rightW === 0) return undefined;
    return `inset(0 calc(${totalWidth}px - var(--vgrid-sl, 0px) - var(--vgrid-vw, ${totalWidth}px) + ${rightW}px) 0 calc(var(--vgrid-sl, 0px) + ${leftW}px))`;
  }, [pinMeta, columns, totalWidth]);

  // --- Scroll handler ---

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    if (overlayClipPath) {
      target.style.setProperty("--vgrid-sl", `${target.scrollLeft}px`);
      target.style.setProperty("--vgrid-vw", `${target.clientWidth}px`);
    }
  };

  // --- Selection state ---

  const ranges = selectedRanges ?? EMPTY_RANGES;

  const isDraggingRef = useDragSelection(onSelectionMouseUp);

  // --- Offset-aware interactions for global coordinate space ---
  const pinnedTopCount = pinnedTopRows.length;
  const bodyCount = rows.length;

  const pinnedTopInteraction: CellInteraction = useMemo(
    () => ({
      isDraggingRef,
      onCellMouseDown: onCellMouseDown
        ? (coord, mods) =>
            onCellMouseDown({ rowIndex: coord.rowIndex, columnIndex: coord.columnIndex }, mods)
        : undefined,
      onCellMouseEnter: onCellMouseEnter
        ? (coord) => onCellMouseEnter({ rowIndex: coord.rowIndex, columnIndex: coord.columnIndex })
        : undefined,
    }),
    [isDraggingRef, onCellMouseDown, onCellMouseEnter],
  );

  const bodyInteraction: CellInteraction = useMemo(
    () => ({
      isDraggingRef,
      onCellMouseDown: onCellMouseDown
        ? (coord, mods) =>
            onCellMouseDown(
              { rowIndex: coord.rowIndex + pinnedTopCount, columnIndex: coord.columnIndex },
              mods,
            )
        : undefined,
      onCellMouseEnter: onCellMouseEnter
        ? (coord) =>
            onCellMouseEnter({
              rowIndex: coord.rowIndex + pinnedTopCount,
              columnIndex: coord.columnIndex,
            })
        : undefined,
    }),
    [isDraggingRef, onCellMouseDown, onCellMouseEnter, pinnedTopCount],
  );

  const pinnedBottomOffset = pinnedTopCount + bodyCount;
  const pinnedBottomInteraction: CellInteraction = useMemo(
    () => ({
      isDraggingRef,
      onCellMouseDown: onCellMouseDown
        ? (coord, mods) =>
            onCellMouseDown(
              { rowIndex: coord.rowIndex + pinnedBottomOffset, columnIndex: coord.columnIndex },
              mods,
            )
        : undefined,
      onCellMouseEnter: onCellMouseEnter
        ? (coord) =>
            onCellMouseEnter({
              rowIndex: coord.rowIndex + pinnedBottomOffset,
              columnIndex: coord.columnIndex,
            })
        : undefined,
    }),
    [isDraggingRef, onCellMouseDown, onCellMouseEnter, pinnedBottomOffset],
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

  useScrollToFocus(focusedCell, rowHeight, rowAreaHeight, scrollBodyRef, pinnedTopCount, bodyCount);

  // --- Initialize & maintain CSS variables for overlay clip-path ---
  useEffect(() => {
    const el = scrollBodyRef.current;
    if (!el || !overlayClipPath) return undefined;
    el.style.setProperty("--vgrid-sl", `${el.scrollLeft}px`);
    el.style.setProperty("--vgrid-vw", `${el.clientWidth}px`);
    const observer = new ResizeObserver(() => {
      el.style.setProperty("--vgrid-vw", `${el.clientWidth}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [overlayClipPath]);

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
      style={{ outline: "none", height: containerHeight }}
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
            height: virtualRange.totalHeight + stickyHeight + pinnedTopHeight + pinnedBottomHeight,
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
            pinMeta={pinMeta}
          />

          {pinnedTopRows.length > 0 && (
            <PinnedSection
              rows={pinnedTopRows}
              className="vgrid-pinned-top"
              keyPrefix="pinned-top"
              height={pinnedTopHeight}
              columns={columns}
              totalWidth={totalWidth}
              rowHeight={rowHeight}
              stickyTop={stickyHeight}
              interaction={pinnedTopInteraction}
              renderCell={renderCell}
              selectedRanges={ranges}
              selectionAnchor={selectionAnchor}
              focusedCell={focusedCell}
              rowIndexOffset={0}
              sectionRowCount={pinnedTopCount}
              pinMeta={pinMeta}
              overlayClipPath={overlayClipPath}
            />
          )}

          <div
            className="vgrid-rows"
            style={{
              position: "sticky",
              top: stickyHeight + pinnedTopHeight,
              height: rowAreaHeight,
              overflowY: "clip",
              overflowX: "visible",
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
                      interaction={bodyInteraction}
                      renderGroupCell={renderGroupCell}
                      onToggleGroupExpansion={onToggleGroupExpansion}
                      pinMeta={pinMeta}
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
                    interaction={bodyInteraction}
                    renderCell={renderCell}
                    pinMeta={pinMeta}
                  />
                );
              })}
              {overlayClipPath ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: totalWidth,
                    height: virtualRange.totalHeight,
                    pointerEvents: "none",
                    clipPath: overlayClipPath,
                  }}
                >
                  <SelectionOverlay
                    ranges={ranges}
                    columns={columns}
                    rowHeight={rowHeight}
                    rowIndexOffset={pinnedTopCount}
                    sectionRowCount={bodyCount}
                    selectionAnchor={selectionAnchor}
                    focusedCell={focusedCell}
                  />
                </div>
              ) : (
                <SelectionOverlay
                  ranges={ranges}
                  columns={columns}
                  rowHeight={rowHeight}
                  rowIndexOffset={pinnedTopCount}
                  sectionRowCount={bodyCount}
                  selectionAnchor={selectionAnchor}
                  focusedCell={focusedCell}
                />
              )}
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
              stickyBottom={0}
              interaction={pinnedBottomInteraction}
              renderCell={renderCell}
              selectedRanges={ranges}
              selectionAnchor={selectionAnchor}
              focusedCell={focusedCell}
              rowIndexOffset={pinnedBottomOffset}
              sectionRowCount={pinnedBottomRows.length}
              pinMeta={pinMeta}
              overlayClipPath={overlayClipPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
