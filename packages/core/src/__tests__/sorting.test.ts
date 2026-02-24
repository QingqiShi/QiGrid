import { describe, expect, it, vi } from "vitest";
import { createGrid } from "../createGrid";
import type { ColumnDef } from "../types";

interface Person {
  name: string;
  age: number;
  startDate: string | null;
}

const columns: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "age", accessorKey: "age", header: "Age" },
  { id: "startDate", accessorKey: "startDate", header: "Start Date" },
];

const data: Person[] = [
  { name: "Charlie", age: 35, startDate: "2020-01-15" },
  { name: "Alice", age: 30, startDate: "2019-06-01" },
  { name: "Bob", age: 25, startDate: "2021-03-10" },
  { name: "Diana", age: 30, startDate: "2018-11-20" },
];

function getNames(grid: ReturnType<typeof createGrid<Person>>): string[] {
  return grid.getRows().map((r) => r.original.name);
}

describe("sorting", () => {
  describe("single column sort", () => {
    it("sorts strings ascending (locale-aware)", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);
      expect(getNames(grid)).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
    });

    it("sorts strings descending", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "name", direction: "desc" }]);
      expect(getNames(grid)).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
    });

    it("sorts numbers ascending", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "age", direction: "asc" }]);
      const ages = grid.getRows().map((r) => r.original.age);
      expect(ages).toEqual([25, 30, 30, 35]);
    });

    it("sorts numbers descending", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "age", direction: "desc" }]);
      const ages = grid.getRows().map((r) => r.original.age);
      expect(ages).toEqual([35, 30, 30, 25]);
    });

    it("sorts date strings ascending", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "startDate", direction: "asc" }]);
      const dates = grid.getRows().map((r) => r.original.startDate);
      expect(dates).toEqual(["2018-11-20", "2019-06-01", "2020-01-15", "2021-03-10"]);
    });
  });

  describe("multi-column sort", () => {
    it("sorts by primary then secondary column", () => {
      const grid = createGrid({ data, columns });
      // Sort by age asc, then name asc (Alice and Diana both have age 30)
      grid.setSorting([
        { columnId: "age", direction: "asc" },
        { columnId: "name", direction: "asc" },
      ]);
      expect(getNames(grid)).toEqual(["Bob", "Alice", "Diana", "Charlie"]);
    });

    it("secondary sort desc with primary asc", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([
        { columnId: "age", direction: "asc" },
        { columnId: "name", direction: "desc" },
      ]);
      expect(getNames(grid)).toEqual(["Bob", "Diana", "Alice", "Charlie"]);
    });
  });

  describe("toggleSort", () => {
    it("cycles: no sort -> asc -> desc -> no sort", () => {
      const grid = createGrid({ data, columns });

      expect(grid.getState().sorting).toEqual([]);

      grid.toggleSort("name");
      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "asc" }]);

      grid.toggleSort("name");
      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "desc" }]);

      grid.toggleSort("name");
      expect(grid.getState().sorting).toEqual([]);
    });

    it("adds second column sort without removing first", () => {
      const grid = createGrid({ data, columns });

      grid.toggleSort("name");
      grid.toggleSort("age");

      expect(grid.getState().sorting).toEqual([
        { columnId: "name", direction: "asc" },
        { columnId: "age", direction: "asc" },
      ]);
    });

    it("notifies subscribers on each toggle", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();
      grid.subscribe(listener);

      grid.toggleSort("name");
      expect(listener).toHaveBeenCalledTimes(1);

      grid.toggleSort("name");
      expect(listener).toHaveBeenCalledTimes(2);

      grid.toggleSort("name");
      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("custom sortingFn", () => {
    it("uses custom comparator when provided on ColumnDef", () => {
      const customColumns: ColumnDef<Person>[] = [
        {
          id: "name",
          accessorKey: "name",
          header: "Name",
          // Reverse alphabetical as custom sort
          sortingFn: (a, b) => String(b).localeCompare(String(a)),
        },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const grid = createGrid({ data, columns: customColumns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);
      // Custom fn reverses, so "asc" with reverse comparator = D, C, B, A
      expect(getNames(grid)).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
    });
  });

  describe("null/undefined handling", () => {
    it("sorts nulls last in ascending order", () => {
      const dataWithNulls: Person[] = [
        { name: "Alice", age: 30, startDate: null },
        { name: "Bob", age: 25, startDate: "2021-03-10" },
        { name: "Charlie", age: 35, startDate: "2020-01-15" },
      ];
      const grid = createGrid({ data: dataWithNulls, columns });
      grid.setSorting([{ columnId: "startDate", direction: "asc" }]);
      const names = getNames(grid);
      // Alice's null startDate should be last
      expect(names[2]).toBe("Alice");
    });

    it("sorts nulls last in descending order", () => {
      const dataWithNulls: Person[] = [
        { name: "Alice", age: 30, startDate: null },
        { name: "Bob", age: 25, startDate: "2021-03-10" },
        { name: "Charlie", age: 35, startDate: "2020-01-15" },
      ];
      const grid = createGrid({ data: dataWithNulls, columns });
      grid.setSorting([{ columnId: "startDate", direction: "desc" }]);
      const names = getNames(grid);
      // Alice's null startDate should still be last
      expect(names[2]).toBe("Alice");
    });

    it("handles all nulls gracefully", () => {
      const dataAllNulls: Person[] = [
        { name: "Alice", age: 30, startDate: null },
        { name: "Bob", age: 25, startDate: null },
      ];
      const grid = createGrid({ data: dataAllNulls, columns });
      grid.setSorting([{ columnId: "startDate", direction: "asc" }]);
      // Order preserved when all are null
      expect(getNames(grid)).toEqual(["Alice", "Bob"]);
    });
  });

  describe("empty data", () => {
    it("handles empty data array", () => {
      const grid = createGrid({ data: [], columns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);
      expect(grid.getRows()).toEqual([]);
    });

    it("handles single row", () => {
      // biome-ignore lint/style/noNonNullAssertion: test data is known to have elements
      const grid = createGrid({ data: [data[0]!], columns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);
      expect(grid.getRows()).toHaveLength(1);
    });
  });

  describe("does not mutate original data", () => {
    it("original data array is untouched after sorting", () => {
      const original = [...data];
      const grid = createGrid({ data: original, columns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);

      // Original array should be unchanged
      expect(original[0]?.name).toBe("Charlie");
      expect(original[1]?.name).toBe("Alice");
      expect(original[2]?.name).toBe("Bob");
      expect(original[3]?.name).toBe("Diana");
    });
  });

  describe("sorting with data updates", () => {
    it("re-sorts when data changes via setData", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);
      expect(getNames(grid)).toEqual(["Alice", "Bob", "Charlie", "Diana"]);

      grid.setData([
        { name: "Zara", age: 28, startDate: "2022-01-01" },
        { name: "Alice", age: 30, startDate: "2019-06-01" },
      ]);
      expect(getNames(grid)).toEqual(["Alice", "Zara"]);
    });

    it("preserves sorting state after setData", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);

      grid.setData([
        { name: "Zara", age: 28, startDate: "2022-01-01" },
        { name: "Alice", age: 30, startDate: "2019-06-01" },
      ]);

      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "asc" }]);
    });
  });

  describe("initial sorting via options", () => {
    it("accepts initial sorting in GridOptions", () => {
      const grid = createGrid({
        data,
        columns,
        sorting: [{ columnId: "name", direction: "asc" }],
      });
      expect(getNames(grid)).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "asc" }]);
    });

    it("defaults to empty sorting when not provided", () => {
      const grid = createGrid({ data, columns });
      expect(grid.getState().sorting).toEqual([]);
    });
  });

  describe("sorting state in GridState", () => {
    it("sorting is included in state snapshot", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "age", direction: "desc" }]);
      const state = grid.getState();
      expect(state.sorting).toEqual([{ columnId: "age", direction: "desc" }]);
    });

    it("can update sorting via setState", () => {
      const grid = createGrid({ data, columns });
      grid.setState(() => ({ sorting: [{ columnId: "name", direction: "asc" }] }));
      expect(getNames(grid)).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
    });
  });

  describe("unknown column id in sorting", () => {
    it("ignores unknown column ids gracefully", () => {
      const grid = createGrid({ data, columns });
      grid.setSorting([{ columnId: "nonexistent", direction: "asc" }]);
      // Should keep original order
      expect(getNames(grid)).toEqual(["Charlie", "Alice", "Bob", "Diana"]);
    });
  });
});
