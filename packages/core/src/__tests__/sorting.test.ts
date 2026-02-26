import { describe, expect, it, vi } from "vitest";
import { buildColumnModel } from "../columns";
import { createGrid } from "../createGrid";
import { buildRowModel } from "../rowModel";
import { sortRows } from "../sorting";
import type { ColumnDef } from "../types";

interface Person {
  name: string;
  age: number;
  startDate: string | null;
}

const columnDefs: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "age", accessorKey: "age", header: "Age" },
  { id: "startDate", accessorKey: "startDate", header: "Start Date" },
];

const columns = buildColumnModel(columnDefs);

const data: Person[] = [
  { name: "Charlie", age: 35, startDate: "2020-01-15" },
  { name: "Alice", age: 30, startDate: "2019-06-01" },
  { name: "Bob", age: 25, startDate: "2021-03-10" },
  { name: "Diana", age: 30, startDate: "2018-11-20" },
];

function getNames(rows: { original: Person }[]): string[] {
  return rows.map((r) => r.original.name);
}

describe("sorting (pure functions)", () => {
  describe("single column sort", () => {
    it("sorts strings ascending (locale-aware)", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
      expect(getNames(sorted)).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
    });

    it("sorts strings descending", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "desc" }], columns);
      expect(getNames(sorted)).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
    });

    it("sorts numbers ascending", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "age", direction: "asc" }], columns);
      const ages = sorted.map((r) => r.original.age);
      expect(ages).toEqual([25, 30, 30, 35]);
    });

    it("sorts numbers descending", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "age", direction: "desc" }], columns);
      const ages = sorted.map((r) => r.original.age);
      expect(ages).toEqual([35, 30, 30, 25]);
    });

    it("sorts date strings ascending", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "startDate", direction: "asc" }], columns);
      const dates = sorted.map((r) => r.original.startDate);
      expect(dates).toEqual(["2018-11-20", "2019-06-01", "2020-01-15", "2021-03-10"]);
    });
  });

  describe("multi-column sort", () => {
    it("sorts by primary then secondary column", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(
        rows,
        [
          { columnId: "age", direction: "asc" },
          { columnId: "name", direction: "asc" },
        ],
        columns,
      );
      expect(getNames(sorted)).toEqual(["Bob", "Alice", "Diana", "Charlie"]);
    });

    it("secondary sort desc with primary asc", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(
        rows,
        [
          { columnId: "age", direction: "asc" },
          { columnId: "name", direction: "desc" },
        ],
        columns,
      );
      expect(getNames(sorted)).toEqual(["Bob", "Diana", "Alice", "Charlie"]);
    });
  });

  describe("custom sortingFn", () => {
    it("uses custom comparator when provided on ColumnDef", () => {
      const customDefs: ColumnDef<Person>[] = [
        {
          id: "name",
          accessorKey: "name",
          header: "Name",
          // Reverse alphabetical as custom sort
          sortingFn: (a, b) => String(b).localeCompare(String(a)),
        },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const customColumns = buildColumnModel(customDefs);
      const rows = buildRowModel(data, customDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], customColumns);
      // Custom fn reverses, so "asc" with reverse comparator = D, C, B, A
      expect(getNames(sorted)).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
    });
  });

  describe("null/undefined handling", () => {
    it("sorts nulls last in ascending order", () => {
      const dataWithNulls: Person[] = [
        { name: "Alice", age: 30, startDate: null },
        { name: "Bob", age: 25, startDate: "2021-03-10" },
        { name: "Charlie", age: 35, startDate: "2020-01-15" },
      ];
      const rows = buildRowModel(dataWithNulls, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "startDate", direction: "asc" }], columns);
      const names = getNames(sorted);
      // Alice's null startDate should be last
      expect(names[2]).toBe("Alice");
    });

    it("sorts nulls last in descending order", () => {
      const dataWithNulls: Person[] = [
        { name: "Alice", age: 30, startDate: null },
        { name: "Bob", age: 25, startDate: "2021-03-10" },
        { name: "Charlie", age: 35, startDate: "2020-01-15" },
      ];
      const rows = buildRowModel(dataWithNulls, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "startDate", direction: "desc" }], columns);
      const names = getNames(sorted);
      // Alice's null startDate should still be last
      expect(names[2]).toBe("Alice");
    });

    it("handles all nulls gracefully", () => {
      const dataAllNulls: Person[] = [
        { name: "Alice", age: 30, startDate: null },
        { name: "Bob", age: 25, startDate: null },
      ];
      const rows = buildRowModel(dataAllNulls, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "startDate", direction: "asc" }], columns);
      // Order preserved when all are null
      expect(getNames(sorted)).toEqual(["Alice", "Bob"]);
    });
  });

  describe("empty data", () => {
    it("handles empty data array", () => {
      const rows = buildRowModel([] as Person[], columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
      expect(sorted).toEqual([]);
    });

    it("handles single row", () => {
      // biome-ignore lint/style/noNonNullAssertion: test data is known to have elements
      const rows = buildRowModel([data[0]!], columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
      expect(sorted).toHaveLength(1);
    });
  });

  describe("does not mutate input", () => {
    it("original rows array is untouched after sorting", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const originalOrder = getNames(rows);
      sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);

      // Original rows array should be unchanged
      expect(getNames(rows)).toEqual(originalOrder);
    });

    it("original data array is untouched after sorting", () => {
      const original = [...data];
      buildRowModel(original, columnDefs, [], [{ columnId: "name", direction: "asc" }]);

      // Original array should be unchanged
      expect(original[0]?.name).toBe("Charlie");
      expect(original[1]?.name).toBe("Alice");
      expect(original[2]?.name).toBe("Bob");
      expect(original[3]?.name).toBe("Diana");
    });
  });

  describe("unknown column id in sorting", () => {
    it("ignores unknown column ids gracefully", () => {
      const rows = buildRowModel(data, columnDefs, [], []);
      const sorted = sortRows(rows, [{ columnId: "nonexistent", direction: "asc" }], columns);
      // Should keep original order
      expect(getNames(sorted)).toEqual(["Charlie", "Alice", "Bob", "Diana"]);
    });
  });
});

describe("sorting (stateful, via createGrid)", () => {
  describe("toggleSort", () => {
    it("cycles: no sort -> asc -> desc -> no sort", () => {
      const grid = createGrid({ data, columns: columnDefs });

      expect(grid.getState().sorting).toEqual([]);

      grid.toggleSort("name");
      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "asc" }]);

      grid.toggleSort("name");
      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "desc" }]);

      grid.toggleSort("name");
      expect(grid.getState().sorting).toEqual([]);
    });

    it("adds second column sort without removing first", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.toggleSort("name");
      grid.toggleSort("age");

      expect(grid.getState().sorting).toEqual([
        { columnId: "name", direction: "asc" },
        { columnId: "age", direction: "asc" },
      ]);
    });

    it("notifies subscribers on each toggle", () => {
      const grid = createGrid({ data, columns: columnDefs });
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

  describe("sorting with data updates", () => {
    it("re-sorts when data changes via setData", () => {
      const grid = createGrid({ data, columns: columnDefs });
      grid.setSorting([{ columnId: "name", direction: "asc" }]);
      expect(getNames(grid.getRows())).toEqual(["Alice", "Bob", "Charlie", "Diana"]);

      grid.setData([
        { name: "Zara", age: 28, startDate: "2022-01-01" },
        { name: "Alice", age: 30, startDate: "2019-06-01" },
      ]);
      expect(getNames(grid.getRows())).toEqual(["Alice", "Zara"]);
    });

    it("preserves sorting state after setData", () => {
      const grid = createGrid({ data, columns: columnDefs });
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
        columns: columnDefs,
        sorting: [{ columnId: "name", direction: "asc" }],
      });
      expect(getNames(grid.getRows())).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
      expect(grid.getState().sorting).toEqual([{ columnId: "name", direction: "asc" }]);
    });

    it("defaults to empty sorting when not provided", () => {
      const grid = createGrid({ data, columns: columnDefs });
      expect(grid.getState().sorting).toEqual([]);
    });
  });

  describe("sorting state in GridState", () => {
    it("sorting is included in state snapshot", () => {
      const grid = createGrid({ data, columns: columnDefs });
      grid.setSorting([{ columnId: "age", direction: "desc" }]);
      const state = grid.getState();
      expect(state.sorting).toEqual([{ columnId: "age", direction: "desc" }]);
    });

    it("can update sorting via setState", () => {
      const grid = createGrid({ data, columns: columnDefs });
      grid.setState(() => ({ sorting: [{ columnId: "name", direction: "asc" }] }));
      expect(getNames(grid.getRows())).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
    });
  });
});
