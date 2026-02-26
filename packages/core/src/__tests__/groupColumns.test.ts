import { describe, expect, it } from "vitest";
import { buildGroupColumns } from "../columns";
import type { Column } from "../types";

interface Person {
  name: string;
  department: string;
  location: string;
}

const columns: Column<Person>[] = [
  {
    id: "name",
    accessorKey: "name",
    accessorFn: undefined,
    header: "Name",
    getValue: (row) => row.name,
    filterFn: undefined,
    sortingFn: undefined,
    width: 150,
    minWidth: 50,
    maxWidth: Number.POSITIVE_INFINITY,
  },
  {
    id: "department",
    accessorKey: "department",
    accessorFn: undefined,
    header: "Department",
    getValue: (row) => row.department,
    filterFn: undefined,
    sortingFn: undefined,
    width: 150,
    minWidth: 50,
    maxWidth: Number.POSITIVE_INFINITY,
  },
  {
    id: "location",
    accessorKey: "location",
    accessorFn: undefined,
    header: "Location",
    getValue: (row) => row.location,
    filterFn: undefined,
    sortingFn: undefined,
    width: 150,
    minWidth: 50,
    maxWidth: Number.POSITIVE_INFINITY,
  },
];

describe("buildGroupColumns", () => {
  it("returns empty array for groupRows mode", () => {
    const result = buildGroupColumns(["department"], "groupRows", columns);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty grouping", () => {
    const result = buildGroupColumns([], "singleColumn", columns);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty grouping in multipleColumns mode", () => {
    const result = buildGroupColumns([], "multipleColumns", columns);
    expect(result).toEqual([]);
  });

  describe("singleColumn mode", () => {
    it("returns one column with correct id and header", () => {
      const result = buildGroupColumns(["department"], "singleColumn", columns);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("qigrid:group");
      expect(result[0]?.header).toBe("Group");
    });

    it("has groupFor set to '*'", () => {
      const result = buildGroupColumns(["department"], "singleColumn", columns);
      expect(result[0]?.groupFor).toBe("*");
    });

    it("has correct width defaults", () => {
      const result = buildGroupColumns(["department"], "singleColumn", columns);
      expect(result[0]?.width).toBe(200);
      expect(result[0]?.minWidth).toBe(100);
      expect(result[0]?.maxWidth).toBe(600);
    });

    it("getValue returns undefined", () => {
      const result = buildGroupColumns(["department"], "singleColumn", columns);
      const person: Person = { name: "Alice", department: "Eng", location: "NY" };
      expect(result[0]?.getValue(person)).toBeUndefined();
    });

    it("has no filterFn or sortingFn", () => {
      const result = buildGroupColumns(["department"], "singleColumn", columns);
      expect(result[0]?.filterFn).toBeUndefined();
      expect(result[0]?.sortingFn).toBeUndefined();
    });

    it("returns one column regardless of grouping depth", () => {
      const result = buildGroupColumns(["department", "location"], "singleColumn", columns);
      expect(result).toHaveLength(1);
    });
  });

  describe("multipleColumns mode", () => {
    it("returns N columns matching grouping length", () => {
      const result = buildGroupColumns(["department", "location"], "multipleColumns", columns);
      expect(result).toHaveLength(2);
    });

    it("columns have correct ids", () => {
      const result = buildGroupColumns(["department", "location"], "multipleColumns", columns);
      expect(result[0]?.id).toBe("qigrid:group:department");
      expect(result[1]?.id).toBe("qigrid:group:location");
    });

    it("headers are derived from source columns", () => {
      const result = buildGroupColumns(["department", "location"], "multipleColumns", columns);
      expect(result[0]?.header).toBe("Department");
      expect(result[1]?.header).toBe("Location");
    });

    it("groupFor matches the source column id", () => {
      const result = buildGroupColumns(["department", "location"], "multipleColumns", columns);
      expect(result[0]?.groupFor).toBe("department");
      expect(result[1]?.groupFor).toBe("location");
    });

    it("has correct width defaults", () => {
      const result = buildGroupColumns(["department"], "multipleColumns", columns);
      expect(result[0]?.width).toBe(200);
      expect(result[0]?.minWidth).toBe(100);
      expect(result[0]?.maxWidth).toBe(600);
    });

    it("falls back to columnId as header when source column not found", () => {
      const result = buildGroupColumns(["unknown"], "multipleColumns", columns);
      expect(result[0]?.header).toBe("unknown");
    });
  });
});
