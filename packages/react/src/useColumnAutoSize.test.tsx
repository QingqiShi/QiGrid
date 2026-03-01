import type { ColumnDef } from "@qigrid/core";
import { buildColumnModel } from "@qigrid/core";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useColumnAutoSize } from "./useColumnAutoSize";

interface Person {
  name: string;
  age: number;
  email: string;
}

const alice: Person = { name: "Alice", age: 30, email: "alice@example.com" };
const bob: Person = { name: "Bob", age: 25, email: "bob@longer-domain.example.com" };

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

describe("useColumnAutoSize", () => {
  it("measures widths correctly from header and cell content", () => {
    const restore = mockOffsetWidth();
    try {
      const defs: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "email", accessorKey: "email", header: "Email" },
      ];
      const columns = buildColumnModel(defs);
      const data = [alice, bob];

      const { result } = renderHook(() => useColumnAutoSize({ columns, data }));
      const widths = result.current.autoSizeColumns();

      // "Bob" is shorter than "bob@longer-domain.example.com" (30 chars)
      // Header "Name" is 4 chars, "Alice" is 5 chars → max cell = 5 * 8 = 40 + padding
      // Header "Email" is 5 chars, longest email = 30 chars → 30 * 8 = 240 + padding
      expect(widths.name).toBe("Alice".length * CHAR_WIDTH + DEFAULT_PADDING);
      expect(widths.email).toBe(
        "bob@longer-domain.example.com".length * CHAR_WIDTH + DEFAULT_PADDING,
      );
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
      // "Alice" = 5 chars * 8 = 40 + 32 = 72 → should be clamped to minWidth 200
      const data = [alice];

      const { result } = renderHook(() => useColumnAutoSize({ columns, data }));
      const widths = result.current.autoSizeColumns();

      expect(widths.name).toBe(200);
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
      const data = [alice];

      const { result } = renderHook(() => useColumnAutoSize({ columns, data }));
      const widths = result.current.autoSizeColumns();

      expect(widths.name).toBeUndefined();
      expect(widths.age).toBeDefined();
    } finally {
      restore();
    }
  });

  it("cleans up measurement container from DOM", () => {
    const restore = mockOffsetWidth();
    try {
      const defs: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
      const columns = buildColumnModel(defs);

      const { result } = renderHook(() => useColumnAutoSize({ columns, data: [alice] }));
      const childCountBefore = document.body.children.length;
      result.current.autoSizeColumns();

      expect(document.body.children.length).toBe(childCountBefore);
    } finally {
      restore();
    }
  });
});
