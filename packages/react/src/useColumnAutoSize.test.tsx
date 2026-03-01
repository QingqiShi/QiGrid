import type { Column, ColumnDef } from "@qigrid/core";
import { buildColumnModel } from "@qigrid/core";
import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it } from "vitest";
import { useColumnAutoSize } from "./useColumnAutoSize";

interface Person {
  name: string;
  age: number;
  email: string;
}

/**
 * Build a minimal fake grid DOM that the hook can query.
 * Returns the container element and a cleanup function.
 */
function buildFakeGrid(
  columns: Column<Person>[],
  rows: string[][],
): { gridEl: HTMLDivElement; cleanup: () => void } {
  const gridEl = document.createElement("div");
  gridEl.className = "vgrid";
  document.body.appendChild(gridEl);

  // Header row
  const headerRow = document.createElement("div");
  headerRow.className = "vgrid-header-row";
  for (const col of columns) {
    const cell = document.createElement("div");
    cell.className = "vgrid-header-cell";
    cell.style.width = `${col.width}px`;
    cell.textContent = col.header;
    headerRow.appendChild(cell);
  }
  gridEl.appendChild(headerRow);

  // Data rows
  for (const rowData of rows) {
    const row = document.createElement("div");
    row.className = "vgrid-row";
    for (let i = 0; i < columns.length; i++) {
      const cell = document.createElement("div");
      cell.className = "vgrid-cell";
      cell.style.width = `${(columns[i] as Column<Person>).width}px`;
      cell.textContent = String(rowData[i]);
      row.appendChild(cell);
    }
    gridEl.appendChild(row);
  }

  return {
    gridEl,
    cleanup: () => document.body.removeChild(gridEl),
  };
}

/** Approximate char width used by our mock offsetWidth. */
const CHAR_WIDTH = 8;
const DEFAULT_PADDING = 32;

/**
 * Mock offsetWidth on HTMLElement to return textContent.length * CHAR_WIDTH.
 * jsdom always returns 0 for offsetWidth, so we need this for measurement.
 */
function mockOffsetWidth(): () => void {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return (this.textContent?.length ?? 0) * CHAR_WIDTH;
    },
  });
  return () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", original);
    }
  };
}

function makeRef(el: HTMLElement): RefObject<HTMLElement | null> {
  return { current: el };
}

describe("useColumnAutoSize", () => {
  it("measures widths from DOM cells including formatted content", () => {
    const restore = mockOffsetWidth();
    try {
      const defs: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "email", accessorKey: "email", header: "Email" },
      ];
      const columns = buildColumnModel(defs);
      const data = [
        { name: "Alice", age: 30, email: "alice@example.com" },
        { name: "Bob", age: 25, email: "bob@longer-domain.example.com" },
      ];

      // Build fake grid with cell content matching what renderCell would produce
      const { gridEl, cleanup } = buildFakeGrid(columns, [
        ["Alice", "alice@example.com"],
        ["Bob", "bob@longer-domain.example.com"],
      ]);

      const ref = makeRef(gridEl);
      const { result } = renderHook(() => useColumnAutoSize({ columns, data, gridRef: ref }));
      const widths = result.current.autoSizeColumns();

      // Max content width + padding
      // "Alice" (5 chars) > "Name" header (4 chars) → 5 * 8 = 40 + 32 = 72
      // "bob@longer-domain.example.com" (29 chars) > "Email" header (5 chars) → 29 * 8 = 232 + 32 = 264
      expect(widths.name).toBe("Alice".length * CHAR_WIDTH + DEFAULT_PADDING);
      expect(widths.email).toBe(
        "bob@longer-domain.example.com".length * CHAR_WIDTH + DEFAULT_PADDING,
      );

      cleanup();
    } finally {
      restore();
    }
  });

  it("clamps widths to min/max", () => {
    const restore = mockOffsetWidth();
    try {
      const defs: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", minWidth: 200, maxWidth: 300 },
      ];
      const columns = buildColumnModel(defs);
      const data = [{ name: "Alice", age: 30, email: "alice@example.com" }];

      const { gridEl, cleanup } = buildFakeGrid(columns, [["Alice"]]);
      const ref = makeRef(gridEl);

      const { result } = renderHook(() => useColumnAutoSize({ columns, data, gridRef: ref }));
      const widths = result.current.autoSizeColumns();

      // "Alice" = 5 chars * 8 = 40 + 32 = 72 → clamped to minWidth 200
      expect(widths.name).toBe(200);

      cleanup();
    } finally {
      restore();
    }
  });

  it("excludes columns with enableAutoSize: false", () => {
    const restore = mockOffsetWidth();
    try {
      const defs: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", enableAutoSize: false },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const columns = buildColumnModel(defs);
      const data = [{ name: "Alice", age: 30, email: "alice@example.com" }];

      const { gridEl, cleanup } = buildFakeGrid(columns, [["Alice", "30"]]);
      const ref = makeRef(gridEl);

      const { result } = renderHook(() => useColumnAutoSize({ columns, data, gridRef: ref }));
      const widths = result.current.autoSizeColumns();

      expect(widths.name).toBeUndefined();
      expect(widths.age).toBeDefined();

      cleanup();
    } finally {
      restore();
    }
  });

  it("cleans up measurement container from DOM", () => {
    const restore = mockOffsetWidth();
    try {
      const defs: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
      const columns = buildColumnModel(defs);

      const { gridEl, cleanup } = buildFakeGrid(columns, [["Alice"]]);
      const ref = makeRef(gridEl);

      const { result } = renderHook(() =>
        useColumnAutoSize({
          columns,
          data: [{ name: "Alice", age: 30, email: "alice@example.com" }],
          gridRef: ref,
        }),
      );
      const childCountBefore = gridEl.children.length;
      result.current.autoSizeColumns();

      expect(gridEl.children.length).toBe(childCountBefore);

      cleanup();
    } finally {
      restore();
    }
  });
});
