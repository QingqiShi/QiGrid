import { describe, expect, it, vi } from "vitest";
import { buildColumnModel } from "../columns";
import { createGrid } from "../createGrid";
import { filterRows } from "../filtering";
import { buildRowModel } from "../rowModel";
import type { ColumnDef, ColumnFiltersState } from "../types";

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
      const rows = buildRowModel(data, columnDefs, [{ columnId: "active", value: true }], []);

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

describe("column filtering (stateful, via createGrid)", () => {
  describe("clearing filters", () => {
    it("returns all rows when filters are cleared", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilters([{ columnId: "name", value: "Alice" }]);
      expect(grid.getRows()).toHaveLength(1);

      grid.setColumnFilters([]);
      expect(grid.getRows()).toHaveLength(5);
    });

    it("setColumnFilter removes filter when value is empty string", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("name", "Alice");
      expect(grid.getRows()).toHaveLength(1);

      grid.setColumnFilter("name", "");
      expect(grid.getRows()).toHaveLength(5);
    });

    it("setColumnFilter removes filter when value is undefined", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("name", "Alice");
      expect(grid.getRows()).toHaveLength(1);

      grid.setColumnFilter("name", undefined);
      expect(grid.getRows()).toHaveLength(5);
    });

    it("setColumnFilter removes filter when value is null", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("name", "Alice");
      expect(grid.getRows()).toHaveLength(1);

      grid.setColumnFilter("name", null);
      expect(grid.getRows()).toHaveLength(5);
    });
  });

  describe("setColumnFilter convenience method", () => {
    it("adds a filter for a single column", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("name", "bob");

      const rows = grid.getRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.original.name).toBe("Bob");
    });

    it("replaces existing filter for same column", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("name", "Alice");
      expect(grid.getRows()).toHaveLength(1);

      grid.setColumnFilter("name", "Bob");
      const rows = grid.getRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.original.name).toBe("Bob");
    });

    it("preserves filters on other columns", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("active", true);
      grid.setColumnFilter("name", "ali");

      const rows = grid.getRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.original.name).toBe("Alice");
    });
  });

  describe("filter + data update", () => {
    it("reapplies filters when data changes via setData", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("name", "ali");
      expect(grid.getRows()).toHaveLength(1);

      const newData: Person[] = [...data, { name: "Alicia", age: 22, active: true }];
      grid.setData(newData);

      const rows = grid.getRows();
      expect(rows).toHaveLength(2);
      expect(rows[0]?.original.name).toBe("Alice");
      expect(rows[1]?.original.name).toBe("Alicia");
    });

    it("reapplies filters when data changes via setState", () => {
      const grid = createGrid({ data, columns: columnDefs });

      grid.setColumnFilter("age", 30);
      expect(grid.getRows()).toHaveLength(2);

      const newData: Person[] = [{ name: "Zara", age: 30, active: true }];
      grid.setState(() => ({ data: newData }));

      const rows = grid.getRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.original.name).toBe("Zara");
    });
  });

  describe("initial columnFilters option", () => {
    it("applies filters from initial options", () => {
      const filters: ColumnFiltersState = [{ columnId: "name", value: "alice" }];
      const grid = createGrid({ data, columns: columnDefs, columnFilters: filters });

      const rows = grid.getRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.original.name).toBe("Alice");
    });
  });

  describe("state integration", () => {
    it("columnFilters is part of GridState", () => {
      const grid = createGrid({ data, columns: columnDefs });

      expect(grid.getState().columnFilters).toEqual([]);

      grid.setColumnFilter("name", "alice");
      expect(grid.getState().columnFilters).toEqual([{ columnId: "name", value: "alice" }]);
    });

    it("notifies subscribers on filter change", () => {
      const grid = createGrid({ data, columns: columnDefs });
      const listener = vi.fn();
      grid.subscribe(listener);

      grid.setColumnFilter("name", "alice");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies subscribers on setColumnFilters", () => {
      const grid = createGrid({ data, columns: columnDefs });
      const listener = vi.fn();
      grid.subscribe(listener);

      grid.setColumnFilters([{ columnId: "name", value: "alice" }]);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
