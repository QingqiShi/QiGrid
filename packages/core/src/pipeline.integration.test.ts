import { describe, expect, it } from "vitest";
import { buildColumnModel } from "./columns";
import { filterRows, updateColumnFilter } from "./filtering";
import { flattenGroupedRows, groupRows } from "./grouping";
import { sortRows } from "./sorting";
import type {
  ColumnDef,
  ColumnFiltersState,
  GridRow,
  GroupRow,
  LeafRow,
  Row,
  SortingState,
} from "./types";
import { computeVirtualRange, sliceVisibleRows } from "./virtualization";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface Employee {
  name: string;
  department: string;
  location: string;
  age: number;
  salary: number;
}

const employees: Employee[] = [
  { name: "Alice", department: "Engineering", location: "NYC", age: 30, salary: 120000 },
  { name: "Bob", department: "Engineering", location: "SF", age: 35, salary: 130000 },
  { name: "Carol", department: "Engineering", location: "NYC", age: 28, salary: 110000 },
  { name: "Dan", department: "Engineering", location: "SF", age: 42, salary: 150000 },
  { name: "Eve", department: "Sales", location: "NYC", age: 38, salary: 90000 },
  { name: "Frank", department: "Sales", location: "SF", age: 45, salary: 95000 },
  { name: "Grace", department: "Sales", location: "Chicago", age: 29, salary: 85000 },
  { name: "Hank", department: "Sales", location: "NYC", age: 33, salary: 92000 },
  { name: "Ivy", department: "HR", location: "Chicago", age: 40, salary: 80000 },
  { name: "Jack", department: "HR", location: "NYC", age: 31, salary: 78000 },
  { name: "Kate", department: "HR", location: "SF", age: 36, salary: 82000 },
  { name: "Leo", department: "Marketing", location: "NYC", age: 27, salary: 70000 },
  { name: "Mia", department: "Marketing", location: "SF", age: 34, salary: 75000 },
  { name: "Nina", department: "Marketing", location: "Chicago", age: 41, salary: 72000 },
  { name: "Oscar", department: "Marketing", location: "NYC", age: 26, salary: 68000 },
  { name: "Pam", department: "Engineering", location: "Chicago", age: 32, salary: 125000 },
  { name: "Quinn", department: "Sales", location: "SF", age: 37, salary: 88000 },
  { name: "Ray", department: "HR", location: "Chicago", age: 44, salary: 83000 },
  { name: "Sara", department: "Engineering", location: "NYC", age: 29, salary: 115000 },
  { name: "Tom", department: "Marketing", location: "Chicago", age: 39, salary: 73000 },
];

const columnDefs: ColumnDef<Employee>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "location", accessorKey: "location", header: "Location" },
  { id: "age", accessorKey: "age", header: "Age" },
  { id: "salary", accessorKey: "salary", header: "Salary", aggFunc: "sum" },
];

const columns = buildColumnModel(columnDefs);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRows(data: Employee[]): Row<Employee>[] {
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return data.map((original, index) => ({
    index,
    original,
    getValue(columnId: string) {
      return colMap.get(columnId)?.getValue(original);
    },
  }));
}

function leafRows(rows: GridRow<Employee>[]): LeafRow<Employee>[] {
  return rows.filter((r): r is LeafRow<Employee> => r.type === "leaf");
}

function groupRowsOf(rows: GridRow<Employee>[]): GroupRow[] {
  return rows.filter((r): r is GroupRow => r.type === "group");
}

/** Safe array element access for noUncheckedIndexedAccess. */
function at<T>(arr: T[], idx: number): T {
  const v = arr[idx];
  if (v === undefined) throw new Error(`expected element at index ${idx}`);
  return v;
}

const NO_COLLAPSED = new Set<string>();

interface PipelineOptions {
  filters?: ColumnFiltersState;
  sorting?: SortingState;
  grouping?: string[];
  collapsedGroupIds?: ReadonlySet<string>;
  scrollTop?: number;
  containerHeight?: number;
  rowHeight?: number;
  overscan?: number;
}

/**
 * Composes the full pipeline: filter → wrap → sort → group → flatten → virtualize.
 * Mirrors the stages in useGrid.
 */
function runPipeline(data: Employee[], opts: PipelineOptions = {}) {
  const {
    filters = [],
    sorting = [],
    grouping = [],
    collapsedGroupIds = NO_COLLAPSED,
    scrollTop,
    containerHeight = 400,
    rowHeight = 36,
    overscan = 5,
  } = opts;

  // Stage 1: filter raw data
  const filtered = filterRows(data, filters, columns);

  // Stage 2: wrap into Row[]
  const rows = makeRows(filtered);

  // Stage 3: sort
  const sorted = sortRows(rows, sorting, columns);

  // Stage 4-5: group + flatten (or pass through as LeafRow)
  let gridRows: GridRow<Employee>[];
  if (grouping.length === 0) {
    gridRows = sorted.map<LeafRow<Employee>>((row, i) => ({
      type: "leaf",
      index: i,
      original: row.original,
      getValue: row.getValue,
    }));
  } else {
    const grouped = groupRows(sorted, grouping, columns);
    gridRows = flattenGroupedRows(grouped, collapsedGroupIds, columns);
  }

  // Stage 6: virtualize (optional)
  if (scrollTop !== undefined) {
    const range = computeVirtualRange({
      totalRowCount: gridRows.length,
      scrollTop,
      containerHeight,
      rowHeight,
      overscan,
    });
    return { allRows: gridRows, visibleRows: sliceVisibleRows(gridRows, range), range };
  }

  return { allRows: gridRows, visibleRows: gridRows, range: null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pipeline integration", () => {
  // -----------------------------------------------------------------------
  // filter + sort
  // -----------------------------------------------------------------------
  describe("filter + sort", () => {
    it("filters then sorts in correct order", () => {
      const filters = updateColumnFilter([], "department", "Engineering");
      const sorting: SortingState = [{ columnId: "name", direction: "asc" }];

      const { allRows } = runPipeline(employees, { filters, sorting });
      const leaves = leafRows(allRows);

      // Only Engineering employees
      expect(leaves.every((r) => r.original.department === "Engineering")).toBe(true);
      // Sorted by name ascending
      const names = leaves.map((r) => r.original.name);
      expect(names).toEqual([...names].sort());
    });

    it("filter reduces dataset before sort", () => {
      const filters = updateColumnFilter([], "location", "NYC");
      const sorting: SortingState = [{ columnId: "salary", direction: "desc" }];

      const { allRows } = runPipeline(employees, { filters, sorting });
      const leaves = leafRows(allRows);

      const nycEmployees = employees.filter((e) => e.location === "NYC");
      expect(leaves).toHaveLength(nycEmployees.length);

      // Descending salary
      const salaries = leaves.map((r) => r.original.salary);
      for (let i = 1; i < salaries.length; i++) {
        expect(at(salaries, i)).toBeLessThanOrEqual(at(salaries, i - 1));
      }
    });

    it("multi-column sort after filter", () => {
      const filters = updateColumnFilter([], "department", "Marketing");
      const sorting: SortingState = [
        { columnId: "location", direction: "asc" },
        { columnId: "name", direction: "asc" },
      ];

      const { allRows } = runPipeline(employees, { filters, sorting });
      const leaves = leafRows(allRows);

      expect(leaves.every((r) => r.original.department === "Marketing")).toBe(true);
      // Primary sort: location ascending
      const locations = leaves.map((r) => r.original.location);
      expect(locations).toEqual([...locations].sort());
    });
  });

  // -----------------------------------------------------------------------
  // filter + group
  // -----------------------------------------------------------------------
  describe("filter + group", () => {
    it("groups reflect filtered data only", () => {
      const filters = updateColumnFilter([], "location", "NYC");

      const { allRows } = runPipeline(employees, { filters, grouping: ["department"] });
      const groups = groupRowsOf(allRows);
      const leaves = leafRows(allRows);

      // All leaves should be NYC
      expect(leaves.every((r) => r.original.location === "NYC")).toBe(true);

      // Groups should only include departments that have NYC employees
      const nycDepts = new Set(
        employees.filter((e) => e.location === "NYC").map((e) => e.department),
      );
      for (const g of groups) {
        expect(nycDepts.has(g.groupValue as string)).toBe(true);
      }
    });

    it("empty groups are excluded after filtering", () => {
      // Filter to a single department — other department groups should not appear
      const filters = updateColumnFilter([], "department", "HR");

      const { allRows } = runPipeline(employees, { filters, grouping: ["department"] });
      const groups = groupRowsOf(allRows);

      // Should have exactly one group (HR)
      expect(groups).toHaveLength(1);
      expect(at(groups, 0).groupValue).toBe("HR");
    });

    it("multi-level grouping with filter", () => {
      const filters = updateColumnFilter([], "location", "SF");

      const { allRows } = runPipeline(employees, {
        filters,
        grouping: ["department", "location"],
      });
      const leaves = leafRows(allRows);

      // All leaves SF
      expect(leaves.every((r) => r.original.location === "SF")).toBe(true);

      // All level-1 groups should be "SF"
      const locationGroups = groupRowsOf(allRows).filter((g) => g.columnId === "location");
      expect(locationGroups.every((g) => g.groupValue === "SF")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // sort + group
  // -----------------------------------------------------------------------
  describe("sort + group", () => {
    it("rows within groups are sorted", () => {
      const sorting: SortingState = [{ columnId: "salary", direction: "asc" }];

      const { allRows } = runPipeline(employees, { sorting, grouping: ["department"] });

      // For each group, check that leaf rows are in ascending salary order
      let currentGroupLeaves: LeafRow<Employee>[] = [];
      for (const row of allRows) {
        if (row.type === "group") {
          // Verify the previous group's leaves are sorted
          if (currentGroupLeaves.length > 0) {
            const salaries = currentGroupLeaves.map((r) => r.original.salary);
            for (let i = 1; i < salaries.length; i++) {
              expect(at(salaries, i)).toBeGreaterThanOrEqual(at(salaries, i - 1));
            }
          }
          currentGroupLeaves = [];
        } else {
          currentGroupLeaves.push(row);
        }
      }
      // Check last group
      if (currentGroupLeaves.length > 0) {
        const salaries = currentGroupLeaves.map((r) => r.original.salary);
        for (let i = 1; i < salaries.length; i++) {
          expect(at(salaries, i)).toBeGreaterThanOrEqual(at(salaries, i - 1));
        }
      }
    });

    it("descending sort within groups", () => {
      const sorting: SortingState = [{ columnId: "name", direction: "desc" }];

      const { allRows } = runPipeline(employees, { sorting, grouping: ["location"] });

      let currentGroupLeaves: LeafRow<Employee>[] = [];
      for (const row of allRows) {
        if (row.type === "group") {
          if (currentGroupLeaves.length > 0) {
            const names = currentGroupLeaves.map((r) => r.original.name);
            for (let i = 1; i < names.length; i++) {
              expect(at(names, i) <= at(names, i - 1)).toBe(true);
            }
          }
          currentGroupLeaves = [];
        } else {
          currentGroupLeaves.push(row);
        }
      }
      if (currentGroupLeaves.length > 0) {
        const names = currentGroupLeaves.map((r) => r.original.name);
        for (let i = 1; i < names.length; i++) {
          expect(at(names, i) <= at(names, i - 1)).toBe(true);
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // filter + sort + group
  // -----------------------------------------------------------------------
  describe("filter + sort + group", () => {
    it("all three stages composed", () => {
      const filters = updateColumnFilter([], "location", "NYC");
      const sorting: SortingState = [{ columnId: "age", direction: "asc" }];

      const { allRows } = runPipeline(employees, {
        filters,
        sorting,
        grouping: ["department"],
      });

      const leaves = leafRows(allRows);
      // Only NYC
      expect(leaves.every((r) => r.original.location === "NYC")).toBe(true);

      // Within each group, ages are ascending
      let currentGroupLeaves: LeafRow<Employee>[] = [];
      for (const row of allRows) {
        if (row.type === "group") {
          if (currentGroupLeaves.length > 0) {
            const ages = currentGroupLeaves.map((r) => r.original.age);
            for (let i = 1; i < ages.length; i++) {
              expect(at(ages, i)).toBeGreaterThanOrEqual(at(ages, i - 1));
            }
          }
          currentGroupLeaves = [];
        } else {
          currentGroupLeaves.push(row);
        }
      }
      if (currentGroupLeaves.length > 0) {
        const ages = currentGroupLeaves.map((r) => r.original.age);
        for (let i = 1; i < ages.length; i++) {
          expect(at(ages, i)).toBeGreaterThanOrEqual(at(ages, i - 1));
        }
      }
    });

    it("multi-level grouping with filter and sort", () => {
      const filters = updateColumnFilter([], "location", "NYC");
      const sorting: SortingState = [{ columnId: "name", direction: "asc" }];

      const { allRows } = runPipeline(employees, {
        filters,
        sorting,
        grouping: ["department", "location"],
      });

      const leaves = leafRows(allRows);
      // All leaves should be NYC
      expect(leaves.every((r) => r.original.location === "NYC")).toBe(true);

      // Verify there are groups at two levels (dept at depth 0, location at depth 1)
      const groups = groupRowsOf(allRows);
      const depths = new Set(groups.map((g) => g.depth));
      expect(depths.has(0)).toBe(true);
      expect(depths.has(1)).toBe(true);
    });

    it("filter that empties a group excludes that group", () => {
      const filters = updateColumnFilter([], "department", "HR");
      const sorting: SortingState = [{ columnId: "name", direction: "asc" }];

      const { allRows } = runPipeline(employees, {
        filters,
        sorting,
        grouping: ["department"],
      });

      const groups = groupRowsOf(allRows);
      expect(groups).toHaveLength(1);
      expect(at(groups, 0).groupValue).toBe("HR");

      const leaves = leafRows(allRows);
      const names = leaves.map((r) => r.original.name);
      // HR employees: Ivy, Jack, Kate, Ray — sorted alphabetically
      expect(names).toEqual(["Ivy", "Jack", "Kate", "Ray"]);
    });
  });

  // -----------------------------------------------------------------------
  // group + collapse
  // -----------------------------------------------------------------------
  describe("group + collapse", () => {
    it("collapsed group hides its children", () => {
      const { allRows: expanded } = runPipeline(employees, { grouping: ["department"] });

      // Find the Engineering group ID
      const engGroup = groupRowsOf(expanded).find((g) => g.groupValue === "Engineering");
      if (engGroup === undefined) throw new Error("expected Engineering group");

      const collapsed = new Set<string>([engGroup.groupId]);
      const { allRows: afterCollapse } = runPipeline(employees, {
        grouping: ["department"],
        collapsedGroupIds: collapsed,
      });

      // Engineering group should still be present but not expanded
      const engGroupCollapsed = groupRowsOf(afterCollapse).find(
        (g) => g.groupValue === "Engineering",
      );
      if (engGroupCollapsed === undefined)
        throw new Error("expected Engineering group after collapse");
      expect(engGroupCollapsed.isExpanded).toBe(false);

      // No Engineering leaf rows should be visible
      const engLeaves = leafRows(afterCollapse).filter(
        (r) => r.original.department === "Engineering",
      );
      expect(engLeaves).toHaveLength(0);

      // Total row count should be less
      expect(afterCollapse.length).toBeLessThan(expanded.length);
    });

    it("multi-level collapse hides nested groups", () => {
      const { allRows: expanded } = runPipeline(employees, {
        grouping: ["department", "location"],
      });

      // Find a top-level department group
      const topGroups = groupRowsOf(expanded).filter((g) => g.depth === 0);
      expect(topGroups.length).toBeGreaterThan(0);

      // Collapse the first top-level group
      const firstTopGroup = at(topGroups, 0);
      const collapsed = new Set<string>([firstTopGroup.groupId]);
      const { allRows: afterCollapse } = runPipeline(employees, {
        grouping: ["department", "location"],
        collapsedGroupIds: collapsed,
      });

      // The sub-groups (depth=1) under the collapsed group should not be visible
      const subGroupsOfCollapsed = groupRowsOf(afterCollapse).filter(
        (g) => g.depth === 1 && g.groupId.startsWith(firstTopGroup.groupId),
      );
      expect(subGroupsOfCollapsed).toHaveLength(0);
    });

    it("collapsing one group does not affect others", () => {
      const { allRows: expanded } = runPipeline(employees, { grouping: ["department"] });

      const groups = groupRowsOf(expanded);
      const engGroup = groups.find((g) => g.groupValue === "Engineering");
      if (engGroup === undefined) throw new Error("expected Engineering group");

      const collapsed = new Set<string>([engGroup.groupId]);
      const { allRows: afterCollapse } = runPipeline(employees, {
        grouping: ["department"],
        collapsedGroupIds: collapsed,
      });

      // Other groups' leaves should still be visible
      const salesLeaves = leafRows(afterCollapse).filter((r) => r.original.department === "Sales");
      const expectedSalesCount = employees.filter((e) => e.department === "Sales").length;
      expect(salesLeaves).toHaveLength(expectedSalesCount);
    });
  });

  // -----------------------------------------------------------------------
  // full pipeline with virtualize
  // -----------------------------------------------------------------------
  describe("full pipeline with virtualize", () => {
    it("virtualizes grouped + filtered + sorted results", () => {
      const filters = updateColumnFilter([], "location", "NYC");
      const sorting: SortingState = [{ columnId: "name", direction: "asc" }];

      const { allRows, visibleRows, range } = runPipeline(employees, {
        filters,
        sorting,
        grouping: ["department"],
        scrollTop: 0,
        containerHeight: 200,
        rowHeight: 36,
        overscan: 2,
      });

      expect(range).not.toBeNull();
      // Visible rows should be a subset of all rows
      expect(visibleRows.length).toBeLessThanOrEqual(allRows.length);
      expect(visibleRows.length).toBeGreaterThan(0);
    });

    it("scrolling to middle of grouped data shows correct rows", () => {
      const sorting: SortingState = [{ columnId: "name", direction: "asc" }];

      const { allRows, visibleRows, range } = runPipeline(employees, {
        sorting,
        grouping: ["department"],
        scrollTop: 180, // 5 rows * 36px
        containerHeight: 144, // 4 rows visible
        rowHeight: 36,
        overscan: 1,
      });

      if (range === null) throw new Error("expected range");
      // visibleRows should be a contiguous slice of allRows
      const startIdx = range.startIndex;
      for (let i = 0; i < visibleRows.length; i++) {
        expect(visibleRows[i]).toBe(allRows[startIdx + i]);
      }
    });

    it("collapse affects virtual range total", () => {
      const { allRows: expanded, range: expandedRange } = runPipeline(employees, {
        grouping: ["department"],
        scrollTop: 0,
        containerHeight: 400,
        rowHeight: 36,
      });

      // Collapse Engineering
      const engGroup = groupRowsOf(expanded).find((g) => g.groupValue === "Engineering");
      if (engGroup === undefined) throw new Error("expected Engineering group");
      const collapsed = new Set<string>([engGroup.groupId]);

      const { allRows: collapsedRows, range: collapsedRange } = runPipeline(employees, {
        grouping: ["department"],
        collapsedGroupIds: collapsed,
        scrollTop: 0,
        containerHeight: 400,
        rowHeight: 36,
      });

      if (expandedRange === null || collapsedRange === null) throw new Error("expected ranges");
      expect(collapsedRange.totalHeight).toBeLessThan(expandedRange.totalHeight);
      expect(collapsedRows.length).toBeLessThan(expanded.length);
    });
  });

  // -----------------------------------------------------------------------
  // edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("all rows filtered out while grouped", () => {
      const filters = updateColumnFilter([], "department", "NonexistentDept");

      const { allRows } = runPipeline(employees, {
        filters,
        grouping: ["department"],
      });

      expect(allRows).toHaveLength(0);
    });

    it("all values identical — single group", () => {
      const sameData = employees.map((e) => ({ ...e, department: "Unified" }));

      const { allRows } = runPipeline(sameData, { grouping: ["department"] });

      const groups = groupRowsOf(allRows);
      expect(groups).toHaveLength(1);
      const unifiedGroup = at(groups, 0);
      expect(unifiedGroup.groupValue).toBe("Unified");
      expect(unifiedGroup.leafCount).toBe(sameData.length);
    });

    it("overscan does not exceed total row count", () => {
      // Small dataset, large overscan
      const { visibleRows, range } = runPipeline(employees.slice(0, 3), {
        scrollTop: 0,
        containerHeight: 400,
        rowHeight: 36,
        overscan: 100,
      });

      if (range === null) throw new Error("expected range");
      expect(visibleRows).toHaveLength(3);
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(3);
    });

    it("single-row group", () => {
      // Only one HR person in Chicago
      const filters = updateColumnFilter(
        updateColumnFilter([], "department", "HR"),
        "location",
        "Chicago",
      );

      const { allRows } = runPipeline(employees, {
        filters,
        grouping: ["department", "location"],
      });

      const leaves = leafRows(allRows);
      // Ivy and Ray are HR+Chicago
      expect(leaves.length).toBeGreaterThanOrEqual(1);
      expect(leaves.every((r) => r.original.department === "HR")).toBe(true);
      expect(leaves.every((r) => r.original.location === "Chicago")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // immutability
  // -----------------------------------------------------------------------
  describe("immutability", () => {
    it("original data is untouched after full pipeline", () => {
      const dataCopy = employees.map((e) => ({ ...e }));
      const originalSnapshot = JSON.stringify(dataCopy);

      runPipeline(dataCopy, {
        filters: updateColumnFilter([], "location", "NYC"),
        sorting: [{ columnId: "salary", direction: "desc" }],
        grouping: ["department"],
        collapsedGroupIds: new Set(["department:Engineering"]),
        scrollTop: 36,
        containerHeight: 200,
        rowHeight: 36,
      });

      expect(JSON.stringify(dataCopy)).toBe(originalSnapshot);
    });
  });
});
