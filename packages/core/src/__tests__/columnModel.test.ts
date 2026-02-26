import { describe, expect, it } from "vitest";
import { buildColumnModel, computeTotalWidth } from "../columns";
import type { ColumnDef } from "../types";

interface Person {
  name: string;
  age: number;
  email: string;
}

const alice: Person = { name: "Alice", age: 30, email: "alice@example.com" };
const bob: Person = { name: "Bob", age: 25, email: "bob@example.com" };

describe("column model", () => {
  describe("buildColumnModel", () => {
    it("returns processed Column objects from ColumnDefs", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const cols = buildColumnModel(columns);

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
      const cols = buildColumnModel(columns);
      const col = cols[0];

      expect(col?.id).toBe("display");
      expect(col?.header).toBe("Display");
      expect(col?.accessorFn).toBe(accessorFn);
      expect(col?.accessorKey).toBeUndefined();
    });

    it("rebuilds column model when called with new defs", () => {
      const cols1 = buildColumnModel<Person>([{ id: "name", accessorKey: "name", header: "Name" }]);
      const cols2 = buildColumnModel<Person>([{ id: "age", accessorKey: "age", header: "Age" }]);

      expect(cols1).not.toBe(cols2);
      expect(cols2).toHaveLength(1);
      expect(cols2[0]?.id).toBe("age");
    });
  });

  describe("Column.getValue", () => {
    it("resolves value via accessorKey", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const cols = buildColumnModel(columns);

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
      const cols = buildColumnModel(columns);
      const col = cols[0];

      expect(col?.getValue(alice)).toBe("Alice - 30");
      expect(col?.getValue(bob)).toBe("Bob - 25");
    });

    it("returns undefined when neither accessorKey nor accessorFn is set", () => {
      const columns: ColumnDef<Person>[] = [{ id: "empty", header: "Empty" }];
      const cols = buildColumnModel(columns);
      const col = cols[0];

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
      const cols = buildColumnModel(columns);
      const col = cols[0];

      expect(col?.getValue(alice)).toBe("Alice");
    });
  });

  describe("column sizing", () => {
    it("applies default widths when none specified", () => {
      const columns: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
      const cols = buildColumnModel(columns);
      const col = cols[0];

      expect(col?.width).toBe(150);
      expect(col?.minWidth).toBe(50);
      expect(col?.maxWidth).toBe(Number.POSITIVE_INFINITY);
    });

    it("uses explicit widths from ColumnDef", () => {
      const columns: ColumnDef<Person>[] = [
        {
          id: "name",
          accessorKey: "name",
          header: "Name",
          width: 200,
          minWidth: 100,
          maxWidth: 300,
        },
      ];
      const cols = buildColumnModel(columns);
      const col = cols[0];

      expect(col?.width).toBe(200);
      expect(col?.minWidth).toBe(100);
      expect(col?.maxWidth).toBe(300);
    });

    it("clamps width below minWidth to minWidth", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", width: 30, minWidth: 80 },
      ];
      const cols = buildColumnModel(columns);

      expect(cols[0]?.width).toBe(80);
    });

    it("clamps width above maxWidth to maxWidth", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", width: 500, maxWidth: 250 },
      ];
      const cols = buildColumnModel(columns);

      expect(cols[0]?.width).toBe(250);
    });

    it("clamps default width to minWidth when minWidth exceeds default", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", minWidth: 200 },
      ];
      const cols = buildColumnModel(columns);

      expect(cols[0]?.width).toBe(200);
    });

    it("clamps default width to maxWidth when maxWidth is below default", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", maxWidth: 80 },
      ];
      const cols = buildColumnModel(columns);

      expect(cols[0]?.width).toBe(80);
    });
  });

  describe("computeTotalWidth", () => {
    it("sums column widths", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", width: 200 },
        { id: "age", accessorKey: "age", header: "Age", width: 100 },
        { id: "email", accessorKey: "email", header: "Email", width: 300 },
      ];
      const cols = buildColumnModel(columns);

      expect(computeTotalWidth(cols)).toBe(600);
    });

    it("returns 0 for empty column list", () => {
      expect(computeTotalWidth([])).toBe(0);
    });

    it("uses default widths in sum when unspecified", () => {
      const columns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
      ];
      const cols = buildColumnModel(columns);

      expect(computeTotalWidth(cols)).toBe(300);
    });
  });
});
