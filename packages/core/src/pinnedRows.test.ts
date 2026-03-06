import { describe, expect, it } from "vitest";
import { buildColumnModel } from "./columns";
import { flattenGroupedRows, groupRows } from "./grouping";
import { partitionPinnedRows } from "./pinnedRows";
import type { ColumnDef, GridRow, GroupRow, LeafRow, Row } from "./types";

interface Person {
  name: string;
  department: string;
  pinTop?: boolean;
  pinBottom?: boolean;
}

const columnDefs: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
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

function makeLeafRows(data: Person[]): LeafRow<Person>[] {
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return data.map<LeafRow<Person>>((original, index) => ({
    type: "leaf",
    index,
    original,
    getValue(columnId: string) {
      return colMap.get(columnId)?.getValue(original);
    },
  }));
}

function makeGroupedRows(data: Person[], grouping: string[]): GridRow<Person>[] {
  const rows = makeRows(data);
  const tree = groupRows(rows, grouping, columns);
  return flattenGroupedRows(tree, new Set(), columns);
}

function leafNames<T extends { name: string }>(rows: GridRow<T>[]): string[] {
  return rows.filter((r): r is LeafRow<T> => r.type === "leaf").map((r) => r.original.name);
}

function groupIds(rows: GridRow<unknown>[]): string[] {
  return rows.filter((r): r is GroupRow => r.type === "group").map((r) => r.groupId);
}

const people: Person[] = [
  { name: "Alice", department: "Engineering", pinTop: true },
  { name: "Bob", department: "Engineering" },
  { name: "Carol", department: "Sales", pinBottom: true },
  { name: "Dave", department: "Sales" },
  { name: "Eve", department: "Engineering", pinTop: true, pinBottom: true },
];

const topPred = (row: Person) => row.pinTop === true;
const bottomPred = (row: Person) => row.pinBottom === true;

describe("partitionPinnedRows", () => {
  it("no predicates → all in body (same reference)", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows);

    expect(result.pinnedTop).toEqual([]);
    expect(result.pinnedBottom).toEqual([]);
    expect(result.body).toBe(rows); // same reference
  });

  it("top predicate only → matching leaves in pinnedTop", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows, topPred);

    expect(leafNames(result.pinnedTop)).toEqual(["Alice", "Eve"]);
    expect(leafNames(result.body)).toEqual(["Bob", "Carol", "Dave"]);
    expect(result.pinnedBottom).toEqual([]);
  });

  it("bottom predicate only → matching leaves in pinnedBottom", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows, undefined, bottomPred);

    expect(result.pinnedTop).toEqual([]);
    expect(leafNames(result.body)).toEqual(["Alice", "Bob", "Dave"]);
    expect(leafNames(result.pinnedBottom)).toEqual(["Carol", "Eve"]);
  });

  it("both predicates → correct three-way split", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows, topPred, bottomPred);

    expect(leafNames(result.pinnedTop)).toEqual(["Alice", "Eve"]);
    expect(leafNames(result.body)).toEqual(["Bob", "Dave"]);
    expect(leafNames(result.pinnedBottom)).toEqual(["Carol"]);
  });

  it("top wins when row matches both predicates", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows, topPred, bottomPred);

    // Eve has both pinTop and pinBottom — should be in pinnedTop
    expect(leafNames(result.pinnedTop)).toContain("Eve");
    expect(leafNames(result.pinnedBottom)).not.toContain("Eve");
  });

  it("order preserved within each partition", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows, topPred, bottomPred);

    // Alice (index 0) should come before Eve (index 4) in pinnedTop
    expect(leafNames(result.pinnedTop)).toEqual(["Alice", "Eve"]);
  });

  it("re-indexes each partition from 0", () => {
    const rows = makeLeafRows(people);
    const result = partitionPinnedRows(rows, topPred, bottomPred);

    expect(result.pinnedTop.map((r) => r.index)).toEqual([0, 1]);
    expect(result.body.map((r) => r.index)).toEqual([0, 1]);
    expect(result.pinnedBottom.map((r) => r.index)).toEqual([0]);
  });

  it("empty input → three empty arrays", () => {
    const result = partitionPinnedRows<Person>([], topPred, bottomPred);

    expect(result.pinnedTop).toEqual([]);
    expect(result.body).toEqual([]);
    expect(result.pinnedBottom).toEqual([]);
  });

  describe("with grouping", () => {
    it("pinned leaves extracted from groups, group leafCount adjusted", () => {
      const rows = makeGroupedRows(people, ["department"]);
      const result = partitionPinnedRows(rows, topPred, bottomPred, true);

      // Alice & Eve pinned top (Engineering), Carol pinned bottom (Sales)
      expect(leafNames(result.pinnedTop)).toEqual(["Alice", "Eve"]);
      expect(leafNames(result.pinnedBottom)).toEqual(["Carol"]);
      expect(leafNames(result.body)).toEqual(["Bob", "Dave"]);

      // Engineering group should have leafCount = 1 (only Bob remains)
      const engGroup = result.body.find(
        (r): r is GroupRow => r.type === "group" && r.groupValue === "Engineering",
      );
      expect(engGroup).toBeDefined();
      expect(engGroup!.leafCount).toBe(1);

      // Sales group should have leafCount = 1 (only Dave remains)
      const salesGroup = result.body.find(
        (r): r is GroupRow => r.type === "group" && r.groupValue === "Sales",
      );
      expect(salesGroup).toBeDefined();
      expect(salesGroup!.leafCount).toBe(1);
    });

    it("all leaves pinned → group removed from body", () => {
      const data: Person[] = [
        { name: "Alice", department: "Engineering", pinTop: true },
        { name: "Bob", department: "Engineering", pinTop: true },
        { name: "Carol", department: "Sales" },
      ];
      const rows = makeGroupedRows(data, ["department"]);
      const result = partitionPinnedRows(rows, topPred, undefined, true);

      // Engineering group should be gone from body since all its leaves are pinned
      expect(groupIds(result.body)).not.toContain("department:Engineering");
      // Sales group should remain
      expect(groupIds(result.body)).toContain("department:Sales");
      expect(leafNames(result.pinnedTop)).toEqual(["Alice", "Bob"]);
      expect(leafNames(result.body)).toEqual(["Carol"]);
    });

    it("nested grouping: ancestor group leafCounts adjusted", () => {
      const data: Person[] = [
        { name: "Alice", department: "Engineering", pinTop: true },
        { name: "Bob", department: "Engineering" },
        { name: "Carol", department: "Sales" },
      ];

      // Group by department only (single level)
      const rows = makeGroupedRows(data, ["department"]);
      const result = partitionPinnedRows(rows, topPred, undefined, true);

      expect(leafNames(result.pinnedTop)).toEqual(["Alice"]);
      expect(leafNames(result.body)).toEqual(["Bob", "Carol"]);

      const engGroup = result.body.find(
        (r): r is GroupRow => r.type === "group" && r.groupValue === "Engineering",
      );
      expect(engGroup).toBeDefined();
      expect(engGroup!.leafCount).toBe(1);
    });

    it("no predicates with groups → same reference, no change", () => {
      const rows = makeGroupedRows(people, ["department"]);
      const result = partitionPinnedRows(rows);

      expect(result.body).toBe(rows);
      expect(result.pinnedTop).toEqual([]);
      expect(result.pinnedBottom).toEqual([]);
    });
  });
});
