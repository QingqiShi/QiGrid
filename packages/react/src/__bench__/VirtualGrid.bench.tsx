import type { CellRange, Column, GridRow, LeafRow } from "@qigrid/core";
import { act, render } from "@testing-library/react";
import { bench, describe } from "vitest";
import { VirtualGrid } from "../VirtualGrid";

interface Item {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 600;

const columns: Column<Item>[] = [
  {
    id: "id",
    accessorKey: "id",
    accessorFn: undefined,
    header: "ID",
    getValue: (row) => row.id,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width: 80,
    minWidth: 50,
    maxWidth: 400,
  },
  {
    id: "name",
    accessorKey: "name",
    accessorFn: undefined,
    header: "Name",
    getValue: (row) => row.name,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width: 150,
    minWidth: 50,
    maxWidth: 400,
  },
  {
    id: "department",
    accessorKey: "department",
    accessorFn: undefined,
    header: "Department",
    getValue: (row) => row.department,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width: 150,
    minWidth: 50,
    maxWidth: 400,
  },
  {
    id: "salary",
    accessorKey: "salary",
    accessorFn: undefined,
    header: "Salary",
    getValue: (row) => row.salary,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width: 120,
    minWidth: 50,
    maxWidth: 400,
  },
];

const TOTAL_WIDTH = columns.reduce((sum, c) => sum + c.width, 0);

function generateRows(count: number): GridRow<Item>[] {
  const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance"];
  const rows: GridRow<Item>[] = [];
  for (let i = 0; i < count; i++) {
    const original: Item = {
      id: i,
      name: `Employee ${i}`,
      department: departments[i % departments.length] as string,
      salary: 40000 + (i % 100) * 1000,
    };
    rows.push({
      type: "leaf",
      index: i,
      original,
      getValue: (colId: string) => original[colId as keyof Item],
    } satisfies LeafRow<Item>);
  }
  return rows;
}

const renderCell = (row: LeafRow<Item>, column: Column<Item>) => (
  <span>{String(row.getValue(column.id))}</span>
);
const renderHeaderCell = (column: Column<Item>) => <span>{column.header}</span>;

function renderGrid(
  rows: GridRow<Item>[],
  selectedRanges: CellRange[] = [],
  selectionAnchor: { rowIndex: number; columnIndex: number } | null = null,
) {
  return render(
    <VirtualGrid
      rows={rows}
      columns={columns}
      totalWidth={TOTAL_WIDTH}
      rowHeight={ROW_HEIGHT}
      containerHeight={CONTAINER_HEIGHT}
      renderCell={renderCell}
      renderHeaderCell={renderHeaderCell}
      selectedRanges={selectedRanges}
      selectionAnchor={selectionAnchor}
    />,
  );
}

function simulateScroll(container: HTMLElement, scrollTop: number) {
  Object.defineProperty(container, "scrollTop", {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  act(() => {
    container.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
}

describe("VirtualGrid scroll (10k rows, no selection)", () => {
  const rows = generateRows(10_000);

  bench("10 scroll frames", () => {
    const { container, unmount } = renderGrid(rows);
    const scrollBody = container.querySelector(".vgrid-body") as HTMLElement;

    for (let i = 1; i <= 10; i++) {
      simulateScroll(scrollBody, i * ROW_HEIGHT * 5);
    }

    unmount();
  });
});

describe("VirtualGrid scroll (10k rows, single-cell selection)", () => {
  const rows = generateRows(10_000);
  const ranges: CellRange[] = [
    { start: { rowIndex: 5, columnIndex: 1 }, end: { rowIndex: 5, columnIndex: 1 } },
  ];

  bench("10 scroll frames", () => {
    const { container, unmount } = renderGrid(rows, ranges, { rowIndex: 5, columnIndex: 1 });
    const scrollBody = container.querySelector(".vgrid-body") as HTMLElement;

    for (let i = 1; i <= 10; i++) {
      simulateScroll(scrollBody, i * ROW_HEIGHT * 5);
    }

    unmount();
  });
});

describe("VirtualGrid scroll (10k rows, large range selection)", () => {
  const rows = generateRows(10_000);
  const ranges: CellRange[] = [
    { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 500, columnIndex: 3 } },
  ];

  bench("10 scroll frames", () => {
    const { container, unmount } = renderGrid(rows, ranges, { rowIndex: 0, columnIndex: 0 });
    const scrollBody = container.querySelector(".vgrid-body") as HTMLElement;

    for (let i = 1; i <= 10; i++) {
      simulateScroll(scrollBody, i * ROW_HEIGHT * 5);
    }

    unmount();
  });
});

describe("VirtualGrid scroll (10k rows, 3 ranges)", () => {
  const rows = generateRows(10_000);
  const ranges: CellRange[] = [
    { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 100, columnIndex: 1 } },
    { start: { rowIndex: 200, columnIndex: 2 }, end: { rowIndex: 300, columnIndex: 3 } },
    { start: { rowIndex: 500, columnIndex: 0 }, end: { rowIndex: 600, columnIndex: 3 } },
  ];

  bench("10 scroll frames", () => {
    const { container, unmount } = renderGrid(rows, ranges, { rowIndex: 0, columnIndex: 0 });
    const scrollBody = container.querySelector(".vgrid-body") as HTMLElement;

    for (let i = 1; i <= 10; i++) {
      simulateScroll(scrollBody, i * ROW_HEIGHT * 5);
    }

    unmount();
  });
});
