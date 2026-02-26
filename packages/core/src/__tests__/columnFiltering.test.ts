import { describe, expect, it } from "vitest";
import { buildColumnModel } from "../columns";
import { filterRows } from "../filtering";
import type { ColumnDef, Row } from "../types";

interface Person {
  name: string;
  age: number;
  active: boolean;
}

const columnDefs: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name" as const, header: "Name" },
  { id: "age", accessorKey: "age" as const, header: "Age" },
  { id: "active", accessorKey: "active" as const, header: "Active" },
];

const columns = buildColumnModel(columnDefs);

const data: Person[] = [
  { name: "Alice", age: 30, active: true },
  { name: "Bob", age: 25, active: false },
  { name: "Charlie", age: 35, active: true },
  { name: "Diana", age: 28, active: false },
  { name: "Eve", age: 30, active: true },
];

describe("column filtering (pure functions)", () => {
  describe("single column filter", () => {
    it("filters string column with case-insensitive includes", () => {
      const result = filterRows(data, [{ columnId: "name", value: "ali" }], columns);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Alice");
    });

    it("filters number column with strict equality", () => {
      const result = filterRows(data, [{ columnId: "age", value: 30 }], columns);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Alice");
      expect(result[1]?.name).toBe("Eve");
    });

    it("filters boolean column with strict equality", () => {
      const result = filterRows(data, [{ columnId: "active", value: false }], columns);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Bob");
      expect(result[1]?.name).toBe("Diana");
    });
  });

  describe("multi-column filter (AND logic)", () => {
    it("applies AND logic across multiple column filters", () => {
      const result = filterRows(
        data,
        [
          { columnId: "active", value: true },
          { columnId: "age", value: 30 },
        ],
        columns,
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Alice");
      expect(result[1]?.name).toBe("Eve");
    });

    it("returns empty when AND filters exclude all rows", () => {
      const result = filterRows(
        data,
        [
          { columnId: "name", value: "Alice" },
          { columnId: "active", value: false },
        ],
        columns,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("custom filterFn", () => {
    it("uses custom filterFn when provided on column def", () => {
      const customDefs: ColumnDef<Person>[] = [
        {
          id: "age",
          accessorKey: "age" as const,
          header: "Age",
          filterFn: (value, filterValue) => (value as number) >= (filterValue as number),
        },
        { id: "name", accessorKey: "name" as const, header: "Name" },
      ];
      const customColumns = buildColumnModel(customDefs);

      const result = filterRows(data, [{ columnId: "age", value: 30 }], customColumns);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toEqual(["Alice", "Charlie", "Eve"]);
    });
  });

  describe("clearing filters", () => {
    it("returns all rows when filters are empty", () => {
      const result = filterRows(data, [], columns);
      expect(result).toHaveLength(5);
    });
  });

  describe("empty results", () => {
    it("returns empty array when no rows match filter", () => {
      const result = filterRows(data, [{ columnId: "name", value: "nonexistent" }], columns);

      expect(result).toHaveLength(0);
    });
  });

  describe("does not mutate original data", () => {
    it("original data array is unchanged after filtering", () => {
      const originalData = [...data];
      filterRows(data, [{ columnId: "name", value: "alice" }], columns);

      expect(data).toEqual(originalData);
      expect(data).toHaveLength(5);
    });
  });

  describe("row indices after filtering", () => {
    it("row indices are sequential in filtered results", () => {
      const filtered = filterRows(data, [{ columnId: "active", value: true }], columns);
      const colMap = new Map(columns.map((c) => [c.id, c]));
      const rows: Row<Person>[] = filtered.map((original, index) => ({
        index,
        original,
        getValue(columnId: string) {
          return colMap.get(columnId)?.getValue(original);
        },
      }));

      expect(rows).toHaveLength(3);
      expect(rows[0]?.index).toBe(0);
      expect(rows[1]?.index).toBe(1);
      expect(rows[2]?.index).toBe(2);
    });
  });

  describe("filter ignores unknown columns", () => {
    it("ignores filter for non-existent column", () => {
      const result = filterRows(data, [{ columnId: "nonexistent", value: "test" }], columns);

      expect(result).toHaveLength(5);
    });
  });
});
