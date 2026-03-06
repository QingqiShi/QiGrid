import type { ColumnDef, GridRow, GroupRow, LeafRow } from "@qigrid/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGrid } from "./useGrid";

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

const employeeData: Employee[] = [
  { name: "Alice", department: "Engineering", location: "NYC", age: 30, salary: 120000 },
  { name: "Bob", department: "Engineering", location: "SF", age: 35, salary: 130000 },
  { name: "Carol", department: "Engineering", location: "NYC", age: 28, salary: 110000 },
  { name: "Dan", department: "Sales", location: "NYC", age: 38, salary: 90000 },
  { name: "Eve", department: "Sales", location: "SF", age: 45, salary: 95000 },
  { name: "Frank", department: "Sales", location: "Chicago", age: 29, salary: 85000 },
  { name: "Grace", department: "HR", location: "Chicago", age: 40, salary: 80000 },
  { name: "Hank", department: "HR", location: "NYC", age: 31, salary: 78000 },
  { name: "Ivy", department: "Marketing", location: "SF", age: 34, salary: 75000 },
  { name: "Jack", department: "Marketing", location: "NYC", age: 27, salary: 70000 },
  { name: "Kate", department: "Marketing", location: "Chicago", age: 41, salary: 72000 },
  { name: "Leo", department: "Engineering", location: "Chicago", age: 32, salary: 125000 },
];

const employeeColumns: ColumnDef<Employee>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "location", accessorKey: "location", header: "Location" },
  { id: "age", accessorKey: "age", header: "Age" },
  { id: "salary", accessorKey: "salary", header: "Salary", aggFunc: "sum" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function leafRows<T>(rows: GridRow<T>[]): LeafRow<T>[] {
  return rows.filter((r): r is LeafRow<T> => r.type === "leaf");
}

function groupRowsOf<T>(rows: GridRow<T>[]): GroupRow[] {
  return rows.filter((r): r is GroupRow => r.type === "group");
}

function at<T>(arr: T[], idx: number): T {
  const v = arr[idx];
  if (v === undefined) throw new Error(`expected element at index ${idx}`);
  return v;
}

function findGroup(rows: GridRow<unknown>[], value: string): GroupRow {
  const g = groupRowsOf(rows).find((r) => r.groupValue === value);
  if (g === undefined) throw new Error(`expected group "${value}"`);
  return g;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useGrid integration — multi-step state transitions", () => {
  // -----------------------------------------------------------------------
  // filter while grouped
  // -----------------------------------------------------------------------
  describe("filter while grouped", () => {
    it("groups recompute when filter is applied", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      // Group by department first
      act(() => result.current.setGrouping(["department"]));
      const groupsBefore = groupRowsOf(result.current.rows);
      expect(groupsBefore.length).toBe(4); // Engineering, Sales, HR, Marketing

      // Filter to only Engineering
      act(() => result.current.setColumnFilter("department", "Engineering"));

      const groupsAfter = groupRowsOf(result.current.rows);
      expect(groupsAfter.length).toBe(1);
      expect(groupsAfter[0]?.groupValue).toBe("Engineering");
    });

    it("expanded groups stay expanded after filter", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      // Group and collapse Sales
      act(() => result.current.setGrouping(["department"]));
      const salesGroup = findGroup(result.current.rows, "Sales");
      act(() => result.current.toggleGroupExpansion(salesGroup.groupId));

      // Apply filter that does not affect Engineering
      act(() => result.current.setColumnFilter("location", "NYC"));

      // Engineering should still be expanded (it was never collapsed)
      const engGroup = groupRowsOf(result.current.rows).find((g) => g.groupValue === "Engineering");
      expect(engGroup?.isExpanded).toBe(true);
    });

    it("clearing filter restores all groups", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));
      const groupCountBefore = groupRowsOf(result.current.rows).length;

      // Filter, then clear
      act(() => result.current.setColumnFilter("department", "HR"));
      expect(groupRowsOf(result.current.rows).length).toBe(1);

      act(() => result.current.setColumnFilter("department", ""));
      expect(groupRowsOf(result.current.rows).length).toBe(groupCountBefore);
    });
  });

  // -----------------------------------------------------------------------
  // collapse state persistence
  // -----------------------------------------------------------------------
  describe("collapse state persistence", () => {
    it("collapse survives filter add/remove", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      // Group and collapse Engineering
      act(() => result.current.setGrouping(["department"]));
      const engGroup = findGroup(result.current.rows, "Engineering");
      act(() => result.current.toggleGroupExpansion(engGroup.groupId));

      // Verify collapsed
      expect(
        groupRowsOf(result.current.rows).find((g) => g.groupValue === "Engineering")?.isExpanded,
      ).toBe(false);

      // Add a filter
      act(() => result.current.setColumnFilter("location", "NYC"));

      // Engineering should still be collapsed
      const engAfterFilter = groupRowsOf(result.current.rows).find(
        (g) => g.groupValue === "Engineering",
      );
      expect(engAfterFilter?.isExpanded).toBe(false);

      // Remove filter
      act(() => result.current.setColumnFilter("location", ""));
      const engAfterClear = groupRowsOf(result.current.rows).find(
        (g) => g.groupValue === "Engineering",
      );
      expect(engAfterClear?.isExpanded).toBe(false);
    });

    it("collapse resets on grouping change", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      // Group by department, collapse Engineering
      act(() => result.current.setGrouping(["department"]));
      const engGroup = findGroup(result.current.rows, "Engineering");
      act(() => result.current.toggleGroupExpansion(engGroup.groupId));

      // Change grouping to location
      act(() => result.current.setGrouping(["location"]));

      // All groups should be expanded (collapse state was reset)
      const groups = groupRowsOf(result.current.rows);
      expect(groups.every((g) => g.isExpanded)).toBe(true);
    });

    it("collapseAllGroups then expandAllGroups", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));

      // Collapse all
      act(() => result.current.collapseAllGroups());
      expect(groupRowsOf(result.current.rows).every((g) => !g.isExpanded)).toBe(true);
      expect(leafRows(result.current.rows).length).toBe(0);

      // Expand all
      act(() => result.current.expandAllGroups());
      expect(groupRowsOf(result.current.rows).every((g) => g.isExpanded)).toBe(true);
      expect(leafRows(result.current.rows).length).toBe(employeeData.length);
    });
  });

  // -----------------------------------------------------------------------
  // sort while grouped
  // -----------------------------------------------------------------------
  describe("sort while grouped", () => {
    it("within-group order changes on sort", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));

      // Sort by name ascending
      act(() => result.current.toggleSort("name"));

      // Check Engineering group's leaves are sorted by name
      const rows = result.current.rows;
      const engLeaves: LeafRow<Employee>[] = [];
      let inEng = false;
      for (const row of rows) {
        if (row.type === "group" && row.groupValue === "Engineering") {
          inEng = true;
          continue;
        }
        if (row.type === "group" && inEng) break;
        if (row.type === "leaf" && inEng) engLeaves.push(row);
      }

      const names = engLeaves.map((r) => r.original.name);
      expect(names).toEqual([...names].sort());
    });

    it("sort reversal reflects within groups", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));
      act(() => result.current.toggleSort("salary")); // asc
      act(() => result.current.toggleSort("salary")); // desc

      // Check that within each group, salaries are descending
      let currentLeaves: LeafRow<Employee>[] = [];
      for (const row of result.current.rows) {
        if (row.type === "group") {
          if (currentLeaves.length > 0) {
            const salaries = currentLeaves.map((r) => r.original.salary);
            for (let i = 1; i < salaries.length; i++) {
              expect(at(salaries, i)).toBeLessThanOrEqual(at(salaries, i - 1));
            }
          }
          currentLeaves = [];
        } else {
          currentLeaves.push(row);
        }
      }
      if (currentLeaves.length > 0) {
        const salaries = currentLeaves.map((r) => r.original.salary);
        for (let i = 1; i < salaries.length; i++) {
          expect(at(salaries, i)).toBeLessThanOrEqual(at(salaries, i - 1));
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // multi-step transitions
  // -----------------------------------------------------------------------
  describe("multi-step transitions", () => {
    it("filter + sort + group then clear all", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      // Apply all three
      act(() => result.current.setColumnFilter("location", "NYC"));
      act(() => result.current.toggleSort("name"));
      act(() => result.current.setGrouping(["department"]));

      const groupedLeaves = leafRows(result.current.rows);
      expect(groupedLeaves.every((r) => r.original.location === "NYC")).toBe(true);

      // Clear everything
      act(() => result.current.setColumnFilter("location", ""));
      act(() => result.current.setSorting([]));
      act(() => result.current.setGrouping([]));

      // Should be back to all data, ungrouped
      expect(result.current.rows.length).toBe(employeeData.length);
      expect(result.current.rows.every((r) => r.type === "leaf")).toBe(true);
    });

    it("group → collapse → sort preserves collapse", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));

      // Collapse Sales
      const salesGroup = findGroup(result.current.rows, "Sales");
      act(() => result.current.toggleGroupExpansion(salesGroup.groupId));
      expect(
        leafRows(result.current.rows).filter((r) => r.original.department === "Sales"),
      ).toHaveLength(0);

      // Sort by name
      act(() => result.current.toggleSort("name"));

      // Sales should still be collapsed
      const salesAfter = groupRowsOf(result.current.rows).find((g) => g.groupValue === "Sales");
      expect(salesAfter?.isExpanded).toBe(false);
      expect(
        leafRows(result.current.rows).filter((r) => r.original.department === "Sales"),
      ).toHaveLength(0);
    });

    it("group → collapse → filter → clear filter preserves collapse", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));

      // Collapse HR
      const hrGroup = findGroup(result.current.rows, "HR");
      act(() => result.current.toggleGroupExpansion(hrGroup.groupId));

      // Filter to NYC
      act(() => result.current.setColumnFilter("location", "NYC"));

      // HR group might still exist if it has NYC employees; it should still be collapsed
      const hrAfterFilter = groupRowsOf(result.current.rows).find((g) => g.groupValue === "HR");
      if (hrAfterFilter) {
        expect(hrAfterFilter.isExpanded).toBe(false);
      }

      // Clear filter
      act(() => result.current.setColumnFilter("location", ""));

      // HR should still be collapsed
      const hrAfterClear = groupRowsOf(result.current.rows).find((g) => g.groupValue === "HR");
      expect(hrAfterClear?.isExpanded).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // pinned rows
  // -----------------------------------------------------------------------
  describe("pinned rows", () => {
    it("returns empty pinnedTopRows/pinnedBottomRows by default", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      expect(result.current.pinnedTopRows).toEqual([]);
      expect(result.current.pinnedBottomRows).toEqual([]);
      expect(result.current.rows.length).toBe(employeeData.length);
    });

    it("partitions rows with top predicate", () => {
      const pinnedTopPredicate = (row: Employee) => row.name === "Alice" || row.name === "Bob";
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns, pinnedTopPredicate }),
      );

      expect(leafRows(result.current.pinnedTopRows).map((r) => r.original.name)).toEqual([
        "Alice",
        "Bob",
      ]);
      expect(result.current.rows.length).toBe(employeeData.length - 2);
      expect(result.current.pinnedBottomRows).toEqual([]);
    });

    it("partitions rows with bottom predicate", () => {
      const pinnedBottomPredicate = (row: Employee) => row.name === "Carol";
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns, pinnedBottomPredicate }),
      );

      expect(result.current.pinnedTopRows).toEqual([]);
      expect(leafRows(result.current.pinnedBottomRows).map((r) => r.original.name)).toEqual([
        "Carol",
      ]);
      expect(result.current.rows.length).toBe(employeeData.length - 1);
    });

    it("pinned rows with grouping — pinned leaves extracted from groups", () => {
      const pinnedTopPredicate = (row: Employee) => row.name === "Alice";
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns, pinnedTopPredicate }),
      );

      act(() => result.current.setGrouping(["department"]));

      expect(leafRows(result.current.pinnedTopRows).map((r) => r.original.name)).toEqual(["Alice"]);

      // Engineering group should have reduced leafCount
      const engGroup = groupRowsOf(result.current.rows).find((g) => g.groupValue === "Engineering");
      expect(engGroup).toBeDefined();
      // Alice was in Engineering, so 4 - 1 = 3
      expect(engGroup?.leafCount).toBe(3);
    });

    it("memoization: same predicates + same data → same references", () => {
      const pinnedTopPredicate = (row: Employee) => row.name === "Alice";
      const { result, rerender } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns, pinnedTopPredicate }),
      );

      const firstTop = result.current.pinnedTopRows;
      const firstBody = result.current.rows;

      rerender();

      expect(result.current.pinnedTopRows).toBe(firstTop);
      expect(result.current.rows).toBe(firstBody);
    });
  });

  // -----------------------------------------------------------------------
  // aggregation on transitions
  // -----------------------------------------------------------------------
  describe("aggregation on transitions", () => {
    it("aggregated values update when filter changes", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));

      // Get Engineering group's aggregated salary before filter
      const engBefore = findGroup(result.current.rows, "Engineering");
      const salaryBefore = engBefore.aggregatedValues.salary as number;

      // Filter out some Engineering employees (only NYC)
      act(() => result.current.setColumnFilter("location", "NYC"));

      const engAfter = findGroup(result.current.rows, "Engineering");
      const salaryAfter = engAfter.aggregatedValues.salary as number;

      // NYC Engineering: Alice(120k) + Carol(110k) = 230k
      // All Engineering: Alice(120k) + Bob(130k) + Carol(110k) + Leo(125k) = 485k
      expect(salaryAfter).toBeLessThan(salaryBefore);
      expect(salaryAfter).toBe(120000 + 110000);
    });

    it("aggregated values unchanged on sort", () => {
      const { result } = renderHook(() =>
        useGrid({ data: employeeData, columns: employeeColumns }),
      );

      act(() => result.current.setGrouping(["department"]));

      const engBefore = findGroup(result.current.rows, "Engineering");
      const salaryBefore = engBefore.aggregatedValues.salary;

      // Sort by name
      act(() => result.current.toggleSort("name"));

      const engAfter = findGroup(result.current.rows, "Engineering");
      expect(engAfter.aggregatedValues.salary).toBe(salaryBefore);
    });
  });
});
