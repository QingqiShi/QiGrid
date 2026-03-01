import { describe, expect, it } from "vitest";
import { buildColumnModel, computeAutoSizedWidths } from "./columns";
import type { ColumnDef } from "./types";

interface Person {
  name: string;
  age: number;
}

function makeColumns(defs: ColumnDef<Person>[]) {
  return buildColumnModel(defs);
}

describe("computeAutoSizedWidths", () => {
  it("clamps measured widths to min/max", () => {
    const cols = makeColumns([
      { id: "name", accessorKey: "name", header: "Name", minWidth: 100, maxWidth: 200 },
    ]);
    const result = computeAutoSizedWidths(cols, { name: 300 });

    expect(result.name).toBe(200);
  });

  it("clamps measured widths below minWidth", () => {
    const cols = makeColumns([
      { id: "name", accessorKey: "name", header: "Name", minWidth: 100, maxWidth: 200 },
    ]);
    const result = computeAutoSizedWidths(cols, { name: 50 });

    expect(result.name).toBe(100);
  });

  it("excludes columns with enableAutoSize: false", () => {
    const cols = makeColumns([
      { id: "name", accessorKey: "name", header: "Name", enableAutoSize: false },
      { id: "age", accessorKey: "age", header: "Age" },
    ]);
    const result = computeAutoSizedWidths(cols, { name: 200, age: 120 });

    expect(result.name).toBeUndefined();
    expect(result.age).toBe(120);
  });

  it("skips columns not in measuredWidths map", () => {
    const cols = makeColumns([
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "age", accessorKey: "age", header: "Age" },
    ]);
    const result = computeAutoSizedWidths(cols, { age: 100 });

    expect(result.name).toBeUndefined();
    expect(result.age).toBe(100);
  });

  it("returns empty map for empty input", () => {
    const result = computeAutoSizedWidths([], {});

    expect(result).toEqual({});
  });

  it("passes through widths within range unchanged", () => {
    const cols = makeColumns([
      { id: "name", accessorKey: "name", header: "Name", minWidth: 50, maxWidth: 300 },
    ]);
    const result = computeAutoSizedWidths(cols, { name: 175 });

    expect(result.name).toBe(175);
  });
});
