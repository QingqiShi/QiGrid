import { describe, expect, it } from "vitest";
import { createGrid } from "../createGrid";
import type { ColumnDef } from "../types";

interface Person {
  name: string;
  age: number;
  email: string;
}

const alice: Person = { name: "Alice", age: 30, email: "alice@example.com" };
const bob: Person = { name: "Bob", age: 25, email: "bob@example.com" };
const data: Person[] = [alice, bob];

describe("column model", () => {
  describe("getColumns", () => {
    it("returns processed Column objects from ColumnDefs", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const grid = createGrid({ data, columns });
      const cols = grid.getColumns();

      expect(cols).toHaveLength(2);
      expect(cols[0]?.id).toBe("name");
      expect(cols[0]?.header).toBe("Name");
      expect(cols[0]?.accessorKey).toBe("name");
      expect(cols[1]?.id).toBe("age");
      expect(cols[1]?.header).toBe("Age");
    });

    it("carries forward all ColumnDef properties", () => {
      const accessorFn = (row: Person) => `${row.name} (${row.age})`;
      const columns: ColumnDef<Person>[] = [{ id: "display", accessorFn, header: "Display" }];
      const grid = createGrid({ data, columns });
      const col = grid.getColumns()[0];

      expect(col?.id).toBe("display");
      expect(col?.header).toBe("Display");
      expect(col?.accessorFn).toBe(accessorFn);
      expect(col?.accessorKey).toBeUndefined();
    });

    it("rebuilds column model when setColumns is called", () => {
      const columns: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
      const grid = createGrid({ data, columns });
      const colsBefore = grid.getColumns();

      grid.setColumns([{ id: "age", accessorKey: "age", header: "Age" }]);
      const colsAfter = grid.getColumns();

      expect(colsBefore).not.toBe(colsAfter);
      expect(colsAfter).toHaveLength(1);
      expect(colsAfter[0]?.id).toBe("age");
    });
  });

  describe("Column.getValue", () => {
    it("resolves value via accessorKey", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const grid = createGrid({ data, columns });
      const cols = grid.getColumns();

      expect(cols[0]?.getValue(alice)).toBe("Alice");
      expect(cols[1]?.getValue(alice)).toBe(30);
      expect(cols[0]?.getValue(bob)).toBe("Bob");
      expect(cols[1]?.getValue(bob)).toBe(25);
    });

    it("resolves value via accessorFn", () => {
      const columns: ColumnDef<Person>[] = [
        {
          id: "fullInfo",
          accessorFn: (row) => `${row.name} - ${row.age}`,
          header: "Info",
        },
      ];
      const grid = createGrid({ data, columns });
      const col = grid.getColumns()[0];

      expect(col?.getValue(alice)).toBe("Alice - 30");
      expect(col?.getValue(bob)).toBe("Bob - 25");
    });

    it("returns undefined when neither accessorKey nor accessorFn is set", () => {
      const columns: ColumnDef<Person>[] = [{ id: "empty", header: "Empty" }];
      const grid = createGrid({ data, columns });
      const col = grid.getColumns()[0];

      expect(col?.getValue(alice)).toBeUndefined();
      expect(col?.getValue(bob)).toBeUndefined();
    });

    it("prefers accessorKey over accessorFn when both are set", () => {
      const columns: ColumnDef<Person>[] = [
        {
          id: "name",
          accessorKey: "name",
          accessorFn: () => "from-fn",
          header: "Name",
        },
      ];
      const grid = createGrid({ data, columns });
      const col = grid.getColumns()[0];

      expect(col?.getValue(alice)).toBe("Alice");
    });
  });

  describe("Row.getValue", () => {
    it("delegates to the column's getValue", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const grid = createGrid({ data, columns });
      const rows = grid.getRows();

      expect(rows[0]?.getValue("name")).toBe("Alice");
      expect(rows[0]?.getValue("age")).toBe(30);
      expect(rows[1]?.getValue("name")).toBe("Bob");
      expect(rows[1]?.getValue("age")).toBe(25);
    });

    it("works with accessorFn columns", () => {
      const columns: ColumnDef<Person>[] = [
        {
          id: "display",
          accessorFn: (row) => `${row.name} (${row.email})`,
          header: "Display",
        },
      ];
      const grid = createGrid({ data, columns });
      const row = grid.getRows()[0];

      expect(row?.getValue("display")).toBe("Alice (alice@example.com)");
    });

    it("returns undefined for unknown column id", () => {
      const columns: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
      const grid = createGrid({ data, columns });
      const row = grid.getRows()[0];

      expect(row?.getValue("nonexistent")).toBeUndefined();
    });

    it("reflects column changes after setColumns", () => {
      const columns: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
      const grid = createGrid({ data, columns });
      const row = grid.getRows()[0];

      expect(row?.getValue("name")).toBe("Alice");
      expect(row?.getValue("age")).toBeUndefined();

      grid.setColumns([
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ]);

      // Same row object now resolves the new column
      expect(row?.getValue("age")).toBe(30);
    });
  });
});
