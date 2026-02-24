import { describe, expect, it } from "vitest";
import { createGrid } from "../createGrid";

interface Person {
  name: string;
  age: number;
}

describe("createGrid", () => {
  it("creates a grid instance with data and columns", () => {
    const data: Person[] = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const columns = [
      { id: "name", accessorKey: "name" as const, header: "Name" },
      { id: "age", accessorKey: "age" as const, header: "Age" },
    ];

    const grid = createGrid({ data, columns });

    expect(grid.data).toBe(data);
    expect(grid.columns).toBe(columns);
  });

  it("returns rows with index and original data", () => {
    const data: Person[] = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const columns = [{ id: "name", accessorKey: "name" as const, header: "Name" }];

    const grid = createGrid({ data, columns });
    const rows = grid.getRows();

    expect(rows).toHaveLength(2);
    expect(rows[0]?.index).toBe(0);
    expect(rows[0]?.original).toEqual({ name: "Alice", age: 30 });
    expect(rows[1]?.index).toBe(1);
    expect(rows[1]?.original).toEqual({ name: "Bob", age: 25 });
  });
});
