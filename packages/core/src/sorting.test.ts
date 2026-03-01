import { describe, expect, it } from "vitest";
import { buildColumnModel } from "./columns";
import { cycleSort, sortRows } from "./sorting";
import type { ColumnDef, Row } from "./types";

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

function makeRows(items: Person[]): Row<Person>[] {
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return items.map((original, index) => ({
    index,
    original,
    getValue(columnId: string) {
      return colMap.get(columnId)?.getValue(original);
    },
  }));
}

function getNames(rows: { original: Person }[]): string[] {
  return rows.map((r) => r.original.name);
}

describe("cycleSort", () => {
  describe("single mode (default)", () => {
    it("unsorted column → [{ columnId, direction: 'asc' }]", () => {
      expect(cycleSort([], "name")).toEqual([{ columnId: "name", direction: "asc" }]);
    });

    it("asc → desc", () => {
      expect(cycleSort([{ columnId: "name", direction: "asc" }], "name")).toEqual([
        { columnId: "name", direction: "desc" },
      ]);
    });

    it("desc → []", () => {
      expect(cycleSort([{ columnId: "name", direction: "desc" }], "name")).toEqual([]);
    });

    it("clicking new column replaces existing sort", () => {
      const current = [{ columnId: "name", direction: "asc" as const }];
      expect(cycleSort(current, "age")).toEqual([{ columnId: "age", direction: "asc" }]);
    });

    it("clicking column in multi-sort clears others, keeps column at current direction", () => {
      const current = [
        { columnId: "name", direction: "asc" as const },
        { columnId: "age", direction: "desc" as const },
      ];
      expect(cycleSort(current, "age")).toEqual([{ columnId: "age", direction: "desc" }]);
    });
  });

  describe("multi mode", () => {
    it("appends new column, preserving existing", () => {
      const current = [{ columnId: "name", direction: "asc" as const }];
      expect(cycleSort(current, "age", true)).toEqual([
        { columnId: "name", direction: "asc" },
        { columnId: "age", direction: "asc" },
      ]);
    });

    it("asc → desc in place, others preserved", () => {
      const current = [
        { columnId: "name", direction: "asc" as const },
        { columnId: "age", direction: "asc" as const },
      ];
      expect(cycleSort(current, "age", true)).toEqual([
        { columnId: "name", direction: "asc" },
        { columnId: "age", direction: "desc" },
      ]);
    });

    it("desc → remove, others preserved", () => {
      const current = [
        { columnId: "name", direction: "asc" as const },
        { columnId: "age", direction: "desc" as const },
      ];
      expect(cycleSort(current, "age", true)).toEqual([{ columnId: "name", direction: "asc" }]);
    });
  });

  it("default (no multi arg) behaves as single mode", () => {
    const current = [{ columnId: "name", direction: "asc" as const }];
    // Clicking a new column replaces (single mode behavior)
    expect(cycleSort(current, "age")).toEqual([{ columnId: "age", direction: "asc" }]);
  });
});

describe("sorting (pure functions)", () => {
  describe("single column sort", () => {
    it("sorts strings ascending (locale-aware)", () => {
      const rows = makeRows(data);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
      expect(getNames(sorted)).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
    });

    it("sorts strings descending", () => {
      const rows = makeRows(data);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "desc" }], columns);
      expect(getNames(sorted)).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
    });

    it("sorts numbers ascending", () => {
      const rows = makeRows(data);
      const sorted = sortRows(rows, [{ columnId: "age", direction: "asc" }], columns);
      const ages = sorted.map((r) => r.original.age);
      expect(ages).toEqual([25, 30, 30, 35]);
    });

    it("sorts numbers descending", () => {
      const rows = makeRows(data);
      const sorted = sortRows(rows, [{ columnId: "age", direction: "desc" }], columns);
      const ages = sorted.map((r) => r.original.age);
      expect(ages).toEqual([35, 30, 30, 25]);
    });

    it("sorts date strings ascending", () => {
      const rows = makeRows(data);
      const sorted = sortRows(rows, [{ columnId: "startDate", direction: "asc" }], columns);
      const dates = sorted.map((r) => r.original.startDate);
      expect(dates).toEqual(["2018-11-20", "2019-06-01", "2020-01-15", "2021-03-10"]);
    });
  });

  describe("multi-column sort", () => {
    it("sorts by primary then secondary column", () => {
      const rows = makeRows(data);
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
      const rows = makeRows(data);
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
      const colMap = new Map(customColumns.map((c) => [c.id, c]));
      const rows: Row<Person>[] = data.map((original, index) => ({
        index,
        original,
        getValue(columnId: string) {
          return colMap.get(columnId)?.getValue(original);
        },
      }));
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
      const rows = makeRows(dataWithNulls);
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
      const rows = makeRows(dataWithNulls);
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
      const rows = makeRows(dataAllNulls);
      const sorted = sortRows(rows, [{ columnId: "startDate", direction: "asc" }], columns);
      // Order preserved when all are null
      expect(getNames(sorted)).toEqual(["Alice", "Bob"]);
    });
  });

  describe("empty data", () => {
    it("handles empty data array", () => {
      const rows = makeRows([]);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
      expect(sorted).toEqual([]);
    });

    it("handles single row", () => {
      // biome-ignore lint/style/noNonNullAssertion: test data is known to have elements
      const rows = makeRows([data[0]!]);
      const sorted = sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
      expect(sorted).toHaveLength(1);
    });
  });

  describe("does not mutate input", () => {
    it("original rows array is untouched after sorting", () => {
      const rows = makeRows(data);
      const originalOrder = getNames(rows);
      sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);

      // Original rows array should be unchanged
      expect(getNames(rows)).toEqual(originalOrder);
    });

    it("original data array is untouched after sorting", () => {
      const original = [...data];
      const rows = makeRows(original);
      sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);

      // Original array should be unchanged
      expect(original[0]?.name).toBe("Charlie");
      expect(original[1]?.name).toBe("Alice");
      expect(original[2]?.name).toBe("Bob");
      expect(original[3]?.name).toBe("Diana");
    });
  });

  describe("unknown column id in sorting", () => {
    it("ignores unknown column ids gracefully", () => {
      const rows = makeRows(data);
      const sorted = sortRows(rows, [{ columnId: "nonexistent", direction: "asc" }], columns);
      // Should keep original order
      expect(getNames(sorted)).toEqual(["Charlie", "Alice", "Bob", "Diana"]);
    });
  });
});
