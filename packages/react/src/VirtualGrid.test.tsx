import type { Column, GridRow, GroupRow, LeafRow } from "@qigrid/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VirtualGrid } from "./VirtualGrid";

afterEach(cleanup);

interface Item {
  name: string;
  value: number;
}

const columns: Column<Item>[] = [
  {
    id: "name",
    accessorKey: "name",
    accessorFn: undefined,
    header: "Name",
    getValue: (row) => row.name,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width: 200,
    minWidth: 50,
    maxWidth: Number.POSITIVE_INFINITY,
    enableAutoSize: true,
    pin: undefined,
  },
  {
    id: "value",
    accessorKey: "value",
    accessorFn: undefined,
    header: "Value",
    getValue: (row) => row.value,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width: 100,
    minWidth: 50,
    maxWidth: Number.POSITIVE_INFINITY,
    enableAutoSize: true,
    pin: undefined,
  },
];

function makeLeafRows(count: number): LeafRow<Item>[] {
  return Array.from({ length: count }, (_, i) => ({
    type: "leaf" as const,
    index: i,
    original: { name: `Item ${i}`, value: i * 10 },
    getValue(columnId: string) {
      if (columnId === "name") return `Item ${i}`;
      return i * 10;
    },
  }));
}

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 400;
const TOTAL_WIDTH = 300;

describe("VirtualGrid", () => {
  it("renders only visible rows, not the full dataset", () => {
    const rows = makeLeafRows(1000);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
      />,
    );

    const renderedRows = document.querySelectorAll(".vgrid-row");
    // visible = ceil(400/36) = 12, + 5 overscan bottom = 17 (start at 0, no top overscan)
    expect(renderedRows.length).toBeGreaterThan(5);
    expect(renderedRows.length).toBeLessThan(50);
  });

  it("renders header cells for all columns", () => {
    const rows = makeLeafRows(10);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
      />,
    );

    const headerCells = document.querySelectorAll(".vgrid-header-cell");
    expect(headerCells).toHaveLength(2);
    expect(headerCells[0]?.textContent).toBe("Name");
    expect(headerCells[1]?.textContent).toBe("Value");
  });

  it("applies column widths to header and data cells", () => {
    const rows = makeLeafRows(5);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
      />,
    );

    const headerCells = document.querySelectorAll(".vgrid-header-cell");
    expect((headerCells[0] as HTMLElement).style.width).toBe("200px");
    expect((headerCells[1] as HTMLElement).style.width).toBe("100px");

    const firstRow = document.querySelector(".vgrid-row") as HTMLElement;
    const cells = firstRow.querySelectorAll(".vgrid-cell");
    expect((cells[0] as HTMLElement).style.width).toBe("200px");
    expect((cells[1] as HTMLElement).style.width).toBe("100px");
  });

  it("updates visible rows on scroll", () => {
    const rows = makeLeafRows(1000);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
      />,
    );

    const scrollContainer = document.querySelector(".vgrid-body") as HTMLElement;

    // Scroll to row ~500
    Object.defineProperty(scrollContainer, "scrollTop", {
      value: 500 * ROW_HEIGHT,
      writable: true,
    });
    fireEvent.scroll(scrollContainer);

    const renderedRows = document.querySelectorAll(".vgrid-row");
    const indices = Array.from(renderedRows).map((el) => Number(el.getAttribute("data-row-index")));

    // Should contain rows around index 500
    expect(indices.some((i) => i >= 495 && i <= 505)).toBe(true);
    // Should NOT contain row 0
    expect(indices.includes(0)).toBe(false);
  });

  it("calls onVirtualRangeChange with correct range", () => {
    const rows = makeLeafRows(100);
    const onRangeChange = vi.fn();

    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
        onVirtualRangeChange={onRangeChange}
      />,
    );

    expect(onRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startIndex: 0,
        endIndex: expect.any(Number),
        totalHeight: 100 * ROW_HEIGHT,
        offsetTop: 0,
      }),
    );
  });

  it("renders filter row when renderFilterCell is provided", () => {
    const rows = makeLeafRows(10);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
        renderFilterCell={(col) => <input placeholder={`Filter ${col.header}`} />}
      />,
    );

    const filterRow = document.querySelector(".vgrid-filter-row");
    expect(filterRow).not.toBeNull();
    const filterCells = document.querySelectorAll(".vgrid-filter-cell");
    expect(filterCells).toHaveLength(2);
  });

  it("does not render filter row when renderFilterCell is not provided", () => {
    const rows = makeLeafRows(10);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
      />,
    );

    const filterRow = document.querySelector(".vgrid-filter-row");
    expect(filterRow).toBeNull();
  });

  it("has data-testid attribute for E2E selectors", () => {
    const rows = makeLeafRows(5);
    render(
      <VirtualGrid
        rows={rows}
        columns={columns}
        totalWidth={TOTAL_WIDTH}
        rowHeight={ROW_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
        renderHeaderCell={(col) => <span>{col.header}</span>}
      />,
    );

    expect(screen.getByTestId("virtual-grid")).toBeDefined();
  });

  describe("bufferSize", () => {
    it("does not fire onVirtualRangeChange for scrolls within the same buffer chunk", () => {
      const rows = makeLeafRows(1000);
      const onRangeChange = vi.fn();

      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          bufferSize={20}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          onVirtualRangeChange={onRangeChange}
        />,
      );

      // Initial render fires once
      expect(onRangeChange).toHaveBeenCalledTimes(1);
      const initialRange = onRangeChange.mock.calls[0]?.[0];
      onRangeChange.mockClear();

      const scrollContainer = document.querySelector(".vgrid-body") as HTMLElement;

      // Scroll within the same buffer chunk (rawFirst moves from 0 to ~2, still quantized to 0)
      Object.defineProperty(scrollContainer, "scrollTop", {
        value: 2 * ROW_HEIGHT,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);

      // Should NOT fire again — same quantized range
      expect(onRangeChange).not.toHaveBeenCalled();

      // Scroll past the chunk boundary (bufferSize=20, so row 20+)
      Object.defineProperty(scrollContainer, "scrollTop", {
        value: 20 * ROW_HEIGHT,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);

      // Should fire — new chunk
      expect(onRangeChange).toHaveBeenCalledTimes(1);
      const newRange = onRangeChange.mock.calls[0]?.[0];
      expect(newRange.startIndex).toBeGreaterThan(initialRange.startIndex);
    });
  });

  describe("column resizing", () => {
    it("renders resize handles when onColumnResize is provided", () => {
      const rows = makeLeafRows(5);
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          onColumnResize={vi.fn()}
        />,
      );

      expect(screen.getByTestId("resize-handle-name")).toBeDefined();
      expect(screen.getByTestId("resize-handle-value")).toBeDefined();
    });

    it("does NOT render resize handles when onColumnResize is absent", () => {
      const rows = makeLeafRows(5);
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      expect(document.querySelector(".vgrid-resize-handle")).toBeNull();
    });

    it("calls onColumnResize with correct width during drag", () => {
      const onResize = vi.fn();
      const rows = makeLeafRows(5);

      // Mock setPointerCapture since jsdom lacks it
      Element.prototype.setPointerCapture = vi.fn();
      Element.prototype.releasePointerCapture = vi.fn();

      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          onColumnResize={onResize}
        />,
      );

      const handle = screen.getByTestId("resize-handle-name");

      // Simulate pointerdown at x=100
      fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });

      // Simulate pointermove to x=150 (delta = +50)
      handle.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, bubbles: true }));

      // "name" column starts at width 200, so expect 250
      expect(onResize).toHaveBeenCalledWith("name", 250);

      // Simulate pointerup to end drag
      handle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      // Further moves should NOT trigger callback
      onResize.mockClear();
      handle.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, bubbles: true }));
      expect(onResize).not.toHaveBeenCalled();
    });
  });

  describe("group row rendering", () => {
    function makeGroupedRows(): GridRow<Item>[] {
      return [
        {
          type: "group",
          index: 0,
          groupId: "name:A",
          columnId: "name",
          groupValue: "A",
          depth: 0,
          leafCount: 2,
          isExpanded: true,
          aggregatedValues: {},
        } satisfies GroupRow,
        {
          type: "leaf",
          index: 1,
          original: { name: "A1", value: 10 },
          getValue: (colId: string) => (colId === "name" ? "A1" : 10),
        } satisfies LeafRow<Item>,
        {
          type: "leaf",
          index: 2,
          original: { name: "A2", value: 20 },
          getValue: (colId: string) => (colId === "name" ? "A2" : 20),
        } satisfies LeafRow<Item>,
      ];
    }

    it("renders group rows with .vgrid-group-row class", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const groupRows = document.querySelectorAll(".vgrid-group-row");
      expect(groupRows).toHaveLength(1);
      expect(groupRows[0]?.getAttribute("data-group-id")).toBe("name:A");
    });

    it("invokes renderGroupRow callback for group rows", () => {
      const rows = makeGroupedRows();
      const renderGroupRow = vi.fn(
        (row: GroupRow) => `Group: ${row.groupValue} (${row.leafCount})`,
      );

      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          renderGroupRow={renderGroupRow}
        />,
      );

      expect(renderGroupRow).toHaveBeenCalledTimes(1);
      expect(renderGroupRow).toHaveBeenCalledWith(
        expect.objectContaining({ type: "group", groupValue: "A", leafCount: 2 }),
        expect.any(Function),
      );
    });

    it("leaf rows render normally with cells alongside group rows", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      // 1 group row + 2 leaf rows = 3 total rows
      const allRows = document.querySelectorAll(".vgrid-row");
      expect(allRows).toHaveLength(3);

      // Leaf rows should have cells
      const cells = document.querySelectorAll(".vgrid-cell");
      // 2 leaf rows × 2 columns = 4 cells
      expect(cells).toHaveLength(4);
    });

    it("falls back to default group row content when renderGroupRow is not provided", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const groupCell = document.querySelector(".vgrid-group-cell");
      expect(groupCell?.textContent).toBe("A (2)");
    });
  });

  describe("group row selection in groupRows mode", () => {
    function makeGroupedRows(): GridRow<Item>[] {
      return [
        {
          type: "group",
          index: 0,
          groupId: "name:A",
          columnId: "name",
          groupValue: "A",
          depth: 0,
          leafCount: 2,
          isExpanded: true,
          aggregatedValues: {},
        } satisfies GroupRow,
        {
          type: "leaf",
          index: 1,
          original: { name: "A1", value: 10 },
          getValue: (colId: string) => (colId === "name" ? "A1" : 10),
        } satisfies LeafRow<Item>,
      ];
    }

    it("renders focused cell overlay when focusedCell targets the group row", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="groupRows"
          focusedCell={{ rowIndex: 0, columnIndex: 0 }}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const focusedOverlay = document.querySelector(".vgrid-cell--focused");
      expect(focusedOverlay).not.toBeNull();
      expect(focusedOverlay?.getAttribute("data-row-index")).toBe("0");
    });

    it("renders focused cell overlay targeting the correct row when focusedCell is on a leaf row", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="groupRows"
          focusedCell={{ rowIndex: 1, columnIndex: 0 }}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const focusedOverlay = document.querySelector(".vgrid-cell--focused");
      expect(focusedOverlay).not.toBeNull();
      expect(focusedOverlay?.getAttribute("data-row-index")).toBe("1");
    });

    it("renders selection overlay when group row is in selectedRanges", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="groupRows"
          selectedRanges={[
            { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 0, columnIndex: 1 } },
          ]}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      // Selection is rendered via overlay divs, not per-cell classes
      const rowsContainer = document.querySelector(".vgrid-rows");
      const overlays = rowsContainer?.querySelectorAll("div[style]");
      // Should have at least one overlay div with border styling
      const hasOverlay = Array.from(overlays ?? []).some(
        (el) =>
          (el as HTMLElement).style.pointerEvents === "none" &&
          (el as HTMLElement).style.border.includes("solid"),
      );
      expect(hasOverlay).toBe(true);
    });

    it("does not render selection overlay when no ranges are selected", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="groupRows"
          selectedRanges={[]}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const rowsContainer = document.querySelector(".vgrid-rows");
      const overlays = Array.from(rowsContainer?.querySelectorAll("div[style]") ?? []).filter(
        (el) =>
          (el as HTMLElement).style.pointerEvents === "none" &&
          (el as HTMLElement).style.border.includes("solid"),
      );
      expect(overlays).toHaveLength(0);
    });
  });

  describe("group display types", () => {
    const groupColumn: Column<Item> = {
      id: "qigrid:group",
      accessorKey: undefined,
      accessorFn: undefined,
      header: "Group",
      getValue: () => undefined,
      filterFn: undefined,
      sortingFn: undefined,
      aggFunc: undefined,
      width: 200,
      minWidth: 100,
      maxWidth: 600,
      enableAutoSize: true,
      pin: undefined,
      groupFor: "*",
    };

    const multiGroupCol: Column<Item> = {
      id: "qigrid:group:name",
      accessorKey: undefined,
      accessorFn: undefined,
      header: "Name",
      getValue: () => undefined,
      filterFn: undefined,
      sortingFn: undefined,
      aggFunc: undefined,
      width: 200,
      minWidth: 100,
      maxWidth: 600,
      enableAutoSize: true,
      pin: undefined,
      groupFor: "name",
    };

    const columnsWithGroup = [groupColumn, ...columns];
    const columnsWithMultiGroup = [multiGroupCol, ...columns];

    function makeGroupedRows(): GridRow<Item>[] {
      return [
        {
          type: "group",
          index: 0,
          groupId: "name:A",
          columnId: "name",
          groupValue: "A",
          depth: 0,
          leafCount: 2,
          isExpanded: true,
          aggregatedValues: {},
        } satisfies GroupRow,
        {
          type: "leaf",
          index: 1,
          original: { name: "A1", value: 10 },
          getValue: (colId: string) => (colId === "name" ? "A1" : 10),
        } satisfies LeafRow<Item>,
        {
          type: "leaf",
          index: 2,
          original: { name: "A2", value: 20 },
          getValue: (colId: string) => (colId === "name" ? "A2" : 20),
        } satisfies LeafRow<Item>,
      ];
    }

    it("groupRows mode: full-width group rows (no regression)", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="groupRows"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const groupCell = document.querySelector(".vgrid-group-cell");
      expect(groupCell).not.toBeNull();
      expect(groupCell?.textContent).toBe("A (2)");
      // Group row should not have individual .vgrid-cell elements
      const groupRow = document.querySelector(".vgrid-group-row");
      expect(groupRow?.querySelectorAll(".vgrid-cell")).toHaveLength(0);
    });

    it("singleColumn mode: group rows have cells per column", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columnsWithGroup}
          totalWidth={TOTAL_WIDTH + 200}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="singleColumn"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const groupRow = document.querySelector(".vgrid-group-row");
      // Should have individual cells (3 columns: group + name + value)
      const cells = groupRow?.querySelectorAll(".vgrid-cell");
      expect(cells?.length).toBe(3);
    });

    it("singleColumn mode: group column shows toggle button", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columnsWithGroup}
          totalWidth={TOTAL_WIDTH + 200}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="singleColumn"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const toggleButton = document.querySelector(".vgrid-group-toggle");
      expect(toggleButton).not.toBeNull();
      expect(toggleButton?.textContent).toContain("A");
      expect(toggleButton?.textContent).toContain("(2)");
    });

    it("multipleColumns mode: correct column shows content, others empty", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columnsWithMultiGroup}
          totalWidth={TOTAL_WIDTH + 200}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="multipleColumns"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const groupRow = document.querySelector(".vgrid-group-row");
      const cells = groupRow?.querySelectorAll(".vgrid-cell");
      expect(cells?.length).toBe(3);
      // First cell (group col for "name") should have toggle
      const toggleButton = cells?.[0]?.querySelector(".vgrid-group-toggle");
      expect(toggleButton).not.toBeNull();
      // Other cells should be empty (data columns)
      expect(cells?.[1]?.textContent).toBe("");
      expect(cells?.[2]?.textContent).toBe("");
    });

    it("leaf rows: empty group column cells, normal data cells", () => {
      const rows = makeGroupedRows();
      render(
        <VirtualGrid
          rows={rows}
          columns={columnsWithGroup}
          totalWidth={TOTAL_WIDTH + 200}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="singleColumn"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      // Get leaf rows (not group rows)
      const leafRows = document.querySelectorAll(".vgrid-row:not(.vgrid-group-row)");
      expect(leafRows).toHaveLength(2);

      const firstLeafCells = leafRows[0]?.querySelectorAll(".vgrid-cell");
      // 3 cells: group + name + value
      expect(firstLeafCells?.length).toBe(3);
      // First cell (group column) should be empty
      expect(firstLeafCells?.[0]?.textContent).toBe("");
      // Data cells should have content
      expect(firstLeafCells?.[1]?.textContent).toBe("A1");
      expect(firstLeafCells?.[2]?.textContent).toBe("10");
    });

    it("renderGroupCell callback invoked for non-groupRows modes", () => {
      const rows = makeGroupedRows();
      const renderGroupCellFn = vi.fn((row: GroupRow) => `Custom: ${row.groupValue}`);

      render(
        <VirtualGrid
          rows={rows}
          columns={columnsWithGroup}
          totalWidth={TOTAL_WIDTH + 200}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="singleColumn"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          renderGroupCell={renderGroupCellFn}
        />,
      );

      // Called once per column: group column + 2 data columns = 3
      expect(renderGroupCellFn).toHaveBeenCalledTimes(3);
      expect(renderGroupCellFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: "group", groupValue: "A" }),
        expect.objectContaining({ id: "qigrid:group", groupFor: "*" }),
      );
    });

    it("filter row: empty cells for group columns", () => {
      const rows = makeGroupedRows();
      const renderFilterCell = vi.fn((col: Column<Item>) => (
        <input placeholder={`Filter ${col.header}`} />
      ));

      render(
        <VirtualGrid
          rows={rows}
          columns={columnsWithGroup}
          totalWidth={TOTAL_WIDTH + 200}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          groupDisplayType="singleColumn"
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          renderFilterCell={renderFilterCell}
        />,
      );

      const filterCells = document.querySelectorAll(".vgrid-filter-cell");
      expect(filterCells).toHaveLength(3);
      // First filter cell (group column) should be empty
      expect(filterCells[0]?.querySelector("input")).toBeNull();
      // Data filter cells should have inputs
      expect(filterCells[1]?.querySelector("input")).not.toBeNull();
      expect(filterCells[2]?.querySelector("input")).not.toBeNull();
      // renderFilterCell should only be called for non-group columns
      expect(renderFilterCell).toHaveBeenCalledTimes(2);
    });
  });

  describe("pinned rows", () => {
    it("renders pinned-top section with correct CSS class", () => {
      const rows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);

      render(
        <VirtualGrid
          rows={rows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const pinnedTop = document.querySelector(".vgrid-pinned-top");
      expect(pinnedTop).not.toBeNull();
      const pinnedRows = pinnedTop?.querySelectorAll(".vgrid-row");
      expect(pinnedRows?.length).toBe(2);
    });

    it("renders pinned-bottom section with correct CSS class", () => {
      const rows = makeLeafRows(10);
      const pinnedBottomRows = makeLeafRows(3);

      render(
        <VirtualGrid
          rows={rows}
          pinnedBottomRows={pinnedBottomRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const pinnedBottom = document.querySelector(".vgrid-pinned-bottom");
      expect(pinnedBottom).not.toBeNull();
      const pinnedRows = pinnedBottom?.querySelectorAll(".vgrid-row");
      expect(pinnedRows?.length).toBe(3);
    });

    it("no pinned rows → no pinned containers in DOM", () => {
      const rows = makeLeafRows(10);

      render(
        <VirtualGrid
          rows={rows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      expect(document.querySelector(".vgrid-pinned-top")).toBeNull();
      expect(document.querySelector(".vgrid-pinned-bottom")).toBeNull();
    });

    it("scroll body height accounts for pinned row heights", () => {
      const rows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);
      const pinnedBottomRows = makeLeafRows(1);
      render(
        <VirtualGrid
          rows={rows}
          pinnedTopRows={pinnedTopRows}
          pinnedBottomRows={pinnedBottomRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const scrollBody = document.querySelector(".vgrid-body") as HTMLElement;
      expect(scrollBody).not.toBeNull();
      // Pinned sections are inside the scroll body as sticky elements,
      // so the body takes the full container height.
      expect(scrollBody.style.height).toBe(`${CONTAINER_HEIGHT}px`);
    });

    it("onCellMouseDown in pinned-top fires with global rowIndex 0", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);
      const onCellMouseDown = vi.fn();

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          onCellMouseDown={onCellMouseDown}
        />,
      );

      // Click the second pinned-top row's first cell
      const pinnedTop = document.querySelector(".vgrid-pinned-top");
      const cells = pinnedTop?.querySelectorAll(".vgrid-cell");
      expect(cells?.length).toBeGreaterThan(0);
      fireEvent.pointerDown(cells?.[2] as HTMLElement); // row 1, col 0

      expect(onCellMouseDown).toHaveBeenCalledWith(
        { rowIndex: 1, columnIndex: 0 },
        expect.any(Object),
      );
    });

    it("onCellMouseDown in body fires with global rowIndex = pinnedTopCount + localIndex", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(3);
      const onCellMouseDown = vi.fn();

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          onCellMouseDown={onCellMouseDown}
        />,
      );

      // Click the first body row's first cell
      const bodySection = document.querySelector(".vgrid-rows");
      const cells = bodySection?.querySelectorAll(".vgrid-cell");
      expect(cells?.length).toBeGreaterThan(0);
      fireEvent.pointerDown(cells?.[0] as HTMLElement); // body row 0

      // Global index = pinnedTopCount(3) + localIndex(0) = 3
      expect(onCellMouseDown).toHaveBeenCalledWith(
        { rowIndex: 3, columnIndex: 0 },
        expect.any(Object),
      );
    });

    it("onCellMouseDown in pinned-bottom fires with global rowIndex = pinnedTopCount + bodyCount + localIndex", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);
      const pinnedBottomRows = makeLeafRows(3);
      const onCellMouseDown = vi.fn();

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          pinnedBottomRows={pinnedBottomRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
          onCellMouseDown={onCellMouseDown}
        />,
      );

      const pinnedBottom = document.querySelector(".vgrid-pinned-bottom");
      const cells = pinnedBottom?.querySelectorAll(".vgrid-cell");
      expect(cells?.length).toBeGreaterThan(0);
      fireEvent.pointerDown(cells?.[0] as HTMLElement); // pinned-bottom row 0

      // Global index = pinnedTopCount(2) + bodyCount(10) + localIndex(0) = 12
      expect(onCellMouseDown).toHaveBeenCalledWith(
        { rowIndex: 12, columnIndex: 0 },
        expect.any(Object),
      );
    });

    it("renders SelectionOverlay in pinned-top when range intersects it", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          selectedRanges={[
            { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 0, columnIndex: 1 } },
          ]}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const pinnedTop = document.querySelector(".vgrid-pinned-top");
      const overlays = Array.from(pinnedTop?.querySelectorAll("div[style]") ?? []).filter(
        (el) =>
          (el as HTMLElement).style.pointerEvents === "none" &&
          (el as HTMLElement).style.border.includes("solid"),
      );
      expect(overlays.length).toBeGreaterThan(0);
    });

    it("does NOT render SelectionOverlay in pinned-top when range only covers body rows", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          selectedRanges={[
            // Global row 5 is in body (pinnedTopCount=2, so body starts at 2)
            { start: { rowIndex: 5, columnIndex: 0 }, end: { rowIndex: 5, columnIndex: 1 } },
          ]}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      const pinnedTop = document.querySelector(".vgrid-pinned-top");
      const overlays = Array.from(pinnedTop?.querySelectorAll("div[style]") ?? []).filter(
        (el) =>
          (el as HTMLElement).style.pointerEvents === "none" &&
          (el as HTMLElement).style.border.includes("solid"),
      );
      expect(overlays.length).toBe(0);
    });

    it("cross-partition selection renders overlays in both pinned-top and body", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          selectedRanges={[
            // Range spanning pinned-top row 1 (global 1) through body row 1 (global 3)
            { start: { rowIndex: 1, columnIndex: 0 }, end: { rowIndex: 3, columnIndex: 1 } },
          ]}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      // Check pinned-top has overlay
      const pinnedTop = document.querySelector(".vgrid-pinned-top");
      const pinnedOverlays = Array.from(pinnedTop?.querySelectorAll("div[style]") ?? []).filter(
        (el) =>
          (el as HTMLElement).style.pointerEvents === "none" &&
          (el as HTMLElement).style.border.includes("solid"),
      );
      expect(pinnedOverlays.length).toBeGreaterThan(0);

      // Check body has overlay
      const body = document.querySelector(".vgrid-rows");
      const bodyOverlays = Array.from(body?.querySelectorAll("div[style]") ?? []).filter(
        (el) =>
          (el as HTMLElement).style.pointerEvents === "none" &&
          (el as HTMLElement).style.border.includes("solid"),
      );
      expect(bodyOverlays.length).toBeGreaterThan(0);
    });

    it("focused cell renders in correct section based on global index", () => {
      const bodyRows = makeLeafRows(10);
      const pinnedTopRows = makeLeafRows(2);

      render(
        <VirtualGrid
          rows={bodyRows}
          pinnedTopRows={pinnedTopRows}
          columns={columns}
          totalWidth={TOTAL_WIDTH}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          focusedCell={{ rowIndex: 1, columnIndex: 0 }}
          renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
          renderHeaderCell={(col) => <span>{col.header}</span>}
        />,
      );

      // Focused cell should appear in pinned-top (global index 1 < pinnedTopCount 2)
      const pinnedTop = document.querySelector(".vgrid-pinned-top");
      const focusInPinned = pinnedTop?.querySelector(".vgrid-cell--focused");
      expect(focusInPinned).not.toBeNull();
      expect(focusInPinned?.getAttribute("data-row-index")).toBe("1");

      // Should NOT appear in body
      const body = document.querySelector(".vgrid-rows");
      const focusInBody = body?.querySelector(".vgrid-cell--focused");
      expect(focusInBody).toBeNull();
    });
  });
});
