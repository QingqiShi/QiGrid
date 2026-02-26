import { describe, expect, it } from "vitest";
import { buildColumnModel } from "../columns";
import { flattenGroupedRows, groupRows } from "../grouping";
import type { ColumnDef, GroupRow, LeafRow, Row } from "../types";

interface Person {
  name: string;
  department: string;
  location: string;
  age: number | null;
}

const columnDefs: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "location", accessorKey: "location", header: "Location" },
  { id: "age", accessorKey: "age", header: "Age" },
];

const columns = buildColumnModel(columnDefs);

function makeRows(data: Person[]): Row<Person>[] {
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return data.map((original, index) => ({
    index,
    original,
    getValue(columnId: string) {
      return colMap.get(columnId)?.getValue(original);
    },
  }));
}

const people: Person[] = [
  { name: "Alice", department: "Engineering", location: "NYC", age: 30 },
  { name: "Bob", department: "Engineering", location: "SF", age: 25 },
  { name: "Carol", department: "Sales", location: "NYC", age: 28 },
  { name: "Dave", department: "Sales", location: "SF", age: 35 },
  { name: "Eve", department: "Engineering", location: "NYC", age: 22 },
];

const NO_COLLAPSED = new Set<string>();

describe("groupRows", () => {
  it("returns empty array when grouping is empty", () => {
    const rows = makeRows(people);
    const result = groupRows(rows, [], columns);
    expect(result).toEqual([]);
  });

  it("groups by single column", () => {
    const rows = makeRows(people);
    const result = groupRows(rows, ["department"], columns);

    expect(result).toHaveLength(2);
    expect(result[0]?.groupValue).toBe("Engineering");
    expect(result[0]?.rows).toHaveLength(3);
    expect(result[1]?.groupValue).toBe("Sales");
    expect(result[1]?.rows).toHaveLength(2);
  });

  it("creates deterministic group IDs", () => {
    const rows = makeRows(people);
    const result = groupRows(rows, ["department"], columns);

    expect(result[0]?.groupId).toBe("department:Engineering");
    expect(result[1]?.groupId).toBe("department:Sales");
  });

  it("groups by multiple columns (nested)", () => {
    const rows = makeRows(people);
    const result = groupRows(rows, ["department", "location"], columns);

    expect(result).toHaveLength(2);
    // Engineering group
    const eng = result[0];
    expect(eng?.children).toHaveLength(2);
    expect(eng?.children[0]?.groupId).toBe("department:Engineering>location:NYC");
    expect(eng?.children[0]?.rows).toHaveLength(2); // Alice, Eve
    expect(eng?.children[1]?.groupId).toBe("department:Engineering>location:SF");
    expect(eng?.children[1]?.rows).toHaveLength(1); // Bob
  });

  it("handles empty data", () => {
    const rows = makeRows([]);
    const result = groupRows(rows, ["department"], columns);
    expect(result).toEqual([]);
  });

  it("handles single group (all identical values)", () => {
    const data = [
      { name: "A", department: "Eng", location: "NYC", age: 20 },
      { name: "B", department: "Eng", location: "NYC", age: 25 },
    ];
    const rows = makeRows(data);
    const result = groupRows(rows, ["department"], columns);

    expect(result).toHaveLength(1);
    expect(result[0]?.rows).toHaveLength(2);
  });

  it("handles all unique values (N groups of 1)", () => {
    const data = [
      { name: "A", department: "Eng", location: "NYC", age: 20 },
      { name: "B", department: "Sales", location: "SF", age: 25 },
      { name: "C", department: "Legal", location: "LA", age: 30 },
    ];
    const rows = makeRows(data);
    const result = groupRows(rows, ["department"], columns);

    expect(result).toHaveLength(3);
    for (const group of result) {
      expect(group.rows).toHaveLength(1);
    }
  });

  it("handles null/undefined group values", () => {
    const data: Person[] = [
      { name: "A", department: "Eng", location: "NYC", age: null },
      { name: "B", department: "Eng", location: "NYC", age: 25 },
      { name: "C", department: "Eng", location: "NYC", age: null },
    ];
    const rows = makeRows(data);
    const result = groupRows(rows, ["age"], columns);

    expect(result).toHaveLength(2);
    const nullGroup = result.find((g) => g.groupId === "age:__null__");
    expect(nullGroup).toBeDefined();
    expect(nullGroup?.rows).toHaveLength(2);
  });

  it("preserves insertion order within groups", () => {
    const rows = makeRows(people);
    const result = groupRows(rows, ["department"], columns);

    const engNames = result[0]?.rows.map((r) => r.original.name);
    expect(engNames).toEqual(["Alice", "Bob", "Eve"]);
  });

  it("ignores unknown column IDs", () => {
    const rows = makeRows(people);
    const result = groupRows(rows, ["nonexistent"], columns);
    expect(result).toEqual([]);
  });
});

describe("flattenGroupedRows", () => {
  it("flattens single-level grouping with all expanded", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED);

    // 2 group rows + 5 leaf rows = 7
    expect(flat).toHaveLength(7);

    // First: Engineering group header
    expect(flat[0]?.type).toBe("group");
    const g0 = flat[0] as GroupRow;
    expect(g0.groupValue).toBe("Engineering");
    expect(g0.leafCount).toBe(3);
    expect(g0.isExpanded).toBe(true);
    expect(g0.depth).toBe(0);

    // Then 3 leaf rows
    expect(flat[1]?.type).toBe("leaf");
    expect(flat[2]?.type).toBe("leaf");
    expect(flat[3]?.type).toBe("leaf");
    expect((flat[1] as LeafRow<Person>).original.name).toBe("Alice");
    expect((flat[2] as LeafRow<Person>).original.name).toBe("Bob");
    expect((flat[3] as LeafRow<Person>).original.name).toBe("Eve");

    // Sales group header
    expect(flat[4]?.type).toBe("group");
    const g4 = flat[4] as GroupRow;
    expect(g4.groupValue).toBe("Sales");
    expect(g4.leafCount).toBe(2);

    // Then 2 leaf rows
    expect(flat[5]?.type).toBe("leaf");
    expect(flat[6]?.type).toBe("leaf");
  });

  it("assigns sequential indices", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED);

    for (let i = 0; i < flat.length; i++) {
      expect(flat[i]?.index).toBe(i);
    }
  });

  it("collapses groups (hides children)", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const collapsed = new Set(["department:Engineering"]);
    const flat = flattenGroupedRows(grouped, collapsed);

    // Engineering header (collapsed) + Sales header + 2 Sales leaves = 4
    expect(flat).toHaveLength(4);

    const g0 = flat[0] as GroupRow;
    expect(g0.groupId).toBe("department:Engineering");
    expect(g0.isExpanded).toBe(false);
    expect(g0.leafCount).toBe(3); // still reports leaf count

    // Next is Sales group
    const g1 = flat[1] as GroupRow;
    expect(g1.groupId).toBe("department:Sales");
    expect(g1.isExpanded).toBe(true);
  });

  it("flattens multi-level grouping", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department", "location"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED);

    // Engineering header, NYC header (2 leaves), SF header (1 leaf), Sales header, NYC header (1 leaf), SF header (1 leaf)
    // = 4 group headers (depth 0: 2, depth 1: 4) + 5 leaves = 11
    // Actually: Eng(depth0), Eng>NYC(depth1), Alice, Eve, Eng>SF(depth1), Bob, Sales(depth0), Sales>NYC(depth1), Carol, Sales>SF(depth1), Dave
    expect(flat).toHaveLength(11);

    const groups = flat.filter((r): r is GroupRow => r.type === "group");
    expect(groups).toHaveLength(6);

    // Check depth
    expect(groups[0]?.depth).toBe(0); // Engineering
    expect(groups[1]?.depth).toBe(1); // Engineering>NYC
    expect(groups[2]?.depth).toBe(1); // Engineering>SF
    expect(groups[3]?.depth).toBe(0); // Sales
    expect(groups[4]?.depth).toBe(1); // Sales>NYC
    expect(groups[5]?.depth).toBe(1); // Sales>SF
  });

  it("collapsing a parent group hides nested children", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department", "location"], columns);
    const collapsed = new Set(["department:Engineering"]);
    const flat = flattenGroupedRows(grouped, collapsed);

    // Just Engineering header (collapsed) + Sales header + 2 sub-groups + 2 leaves = 6
    expect(flat).toHaveLength(6);
    expect((flat[0] as GroupRow).groupId).toBe("department:Engineering");
    expect((flat[0] as GroupRow).isExpanded).toBe(false);
    expect((flat[1] as GroupRow).groupId).toBe("department:Sales");
  });

  it("handles empty grouped structure", () => {
    const flat = flattenGroupedRows([], NO_COLLAPSED);
    expect(flat).toEqual([]);
  });

  it("leaf rows have getValue function", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED);

    const leaves = flat.filter((r): r is LeafRow<Person> => r.type === "leaf");
    expect(leaves[0]?.getValue("name")).toBe("Alice");
    expect(leaves[0]?.getValue("department")).toBe("Engineering");
  });
});

describe("flattenGroupedRows with aggregation", () => {
  const aggColumnDefs: ColumnDef<Person>[] = [
    { id: "name", accessorKey: "name", header: "Name" },
    { id: "department", accessorKey: "department", header: "Department" },
    { id: "location", accessorKey: "location", header: "Location" },
    { id: "age", accessorKey: "age", header: "Age", aggFunc: "sum" },
  ];

  const aggColumns = buildColumnModel(aggColumnDefs);

  it("computes aggregated values for single-level grouping", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED, aggColumns);

    const groups = flat.filter((r): r is GroupRow => r.type === "group");
    // Engineering: Alice(30) + Bob(25) + Eve(22) = 77
    expect(groups[0]?.aggregatedValues.age).toBe(77);
    // Sales: Carol(28) + Dave(35) = 63
    expect(groups[1]?.aggregatedValues.age).toBe(63);
  });

  it("parent group aggregates ALL descendant leaves in multi-level grouping", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department", "location"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED, aggColumns);

    const groups = flat.filter((r): r is GroupRow => r.type === "group");
    // Engineering parent: 30 + 25 + 22 = 77
    const engParent = groups.find((g) => g.groupId === "department:Engineering");
    expect(engParent?.aggregatedValues.age).toBe(77);

    // Engineering>NYC: Alice(30) + Eve(22) = 52
    const engNyc = groups.find((g) => g.groupId === "department:Engineering>location:NYC");
    expect(engNyc?.aggregatedValues.age).toBe(52);

    // Engineering>SF: Bob(25)
    const engSf = groups.find((g) => g.groupId === "department:Engineering>location:SF");
    expect(engSf?.aggregatedValues.age).toBe(25);
  });

  it("collapsed groups still have correct aggregated values", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const collapsed = new Set(["department:Engineering"]);
    const flat = flattenGroupedRows(grouped, collapsed, aggColumns);

    const engGroup = flat.find(
      (r): r is GroupRow => r.type === "group" && r.groupId === "department:Engineering",
    );
    expect(engGroup?.aggregatedValues.age).toBe(77);
    expect(engGroup?.isExpanded).toBe(false);
  });

  it("returns empty aggregatedValues when no columns have aggFunc", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    // columns has no aggFunc
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED, columns);

    const groups = flat.filter((r): r is GroupRow => r.type === "group");
    for (const g of groups) {
      expect(g.aggregatedValues).toEqual({});
    }
  });

  it("returns empty aggregatedValues when columns param is omitted", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED);

    const groups = flat.filter((r): r is GroupRow => r.type === "group");
    for (const g of groups) {
      expect(g.aggregatedValues).toEqual({});
    }
  });

  it("only columns with aggFunc appear in aggregatedValues keys", () => {
    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED, aggColumns);

    const groups = flat.filter((r): r is GroupRow => r.type === "group");
    for (const g of groups) {
      expect(Object.keys(g.aggregatedValues)).toEqual(["age"]);
    }
  });

  it("supports multiple aggFunc columns", () => {
    const multiAggDefs: ColumnDef<Person>[] = [
      { id: "name", accessorKey: "name", header: "Name", aggFunc: "count" },
      { id: "department", accessorKey: "department", header: "Department" },
      { id: "location", accessorKey: "location", header: "Location" },
      { id: "age", accessorKey: "age", header: "Age", aggFunc: "avg" },
    ];
    const multiAggColumns = buildColumnModel(multiAggDefs);

    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED, multiAggColumns);

    const engGroup = flat.find(
      (r): r is GroupRow => r.type === "group" && r.groupId === "department:Engineering",
    );
    expect(engGroup?.aggregatedValues.name).toBe(3); // count of non-null names
    // avg of 30, 25, 22
    expect(engGroup?.aggregatedValues.age).toBeCloseTo(25.666, 2);
  });

  it("supports custom aggFunc", () => {
    const customDefs: ColumnDef<Person>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "department", accessorKey: "department", header: "Department" },
      { id: "location", accessorKey: "location", header: "Location" },
      {
        id: "age",
        accessorKey: "age",
        header: "Age",
        aggFunc: (values: unknown[]) => {
          const nums = values.filter((v): v is number => typeof v === "number");
          return nums.length > 0 ? Math.max(...nums) - Math.min(...nums) : 0;
        },
      },
    ];
    const customColumns = buildColumnModel(customDefs);

    const rows = makeRows(people);
    const grouped = groupRows(rows, ["department"], columns);
    const flat = flattenGroupedRows(grouped, NO_COLLAPSED, customColumns);

    const engGroup = flat.find(
      (r): r is GroupRow => r.type === "group" && r.groupId === "department:Engineering",
    );
    // range: 30 - 22 = 8
    expect(engGroup?.aggregatedValues.age).toBe(8);
  });
});
