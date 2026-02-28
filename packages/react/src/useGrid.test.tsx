import type { ColumnDef, GridRow, GroupRow, LeafRow } from "@qigrid/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGrid } from "./useGrid";

interface Person {
  name: string;
  age: number;
  department?: string;
}

const columns: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name" as const, header: "Name" },
  { id: "age", accessorKey: "age" as const, header: "Age" },
];

function makeData(...names: string[]): Person[] {
  return names.map((name, i) => ({ name, age: 20 + i }));
}

/** Type-safe helper to get leaf rows from useGrid result. */
function leafRows<T>(rows: GridRow<T>[]): LeafRow<T>[] {
  return rows.filter((r): r is LeafRow<T> => r.type === "leaf");
}

describe("useGrid", () => {
  it("returns rows and columns from options", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    expect(result.current.data).toBe(data);
    expect(result.current.columnDefs).toBe(columns);
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.columns).toHaveLength(2);
  });

  it("returns rows that correspond to the initial data", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    const leaves = leafRows(result.current.rows);
    expect(leaves[0]?.original).toEqual({ name: "Alice", age: 20 });
    expect(leaves[1]?.original).toEqual({ name: "Bob", age: 21 });
  });

  it("re-renders with new rows when data prop changes", () => {
    const data1 = makeData("Alice");
    const data2 = makeData("Bob", "Carol");

    const { result, rerender } = renderHook(({ data }) => useGrid({ data, columns }), {
      initialProps: { data: data1 },
    });

    expect(result.current.rows).toHaveLength(1);

    rerender({ data: data2 });

    expect(result.current.rows).toHaveLength(2);
    expect(leafRows(result.current.rows)[0]?.original.name).toBe("Bob");
  });

  it("re-renders with new columns when columns prop changes", () => {
    const data = makeData("Alice");
    const cols1: ColumnDef<Person>[] = [{ id: "name", accessorKey: "name", header: "Name" }];
    const cols2: ColumnDef<Person>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "age", accessorKey: "age", header: "Age" },
    ];

    const { result, rerender } = renderHook(
      ({ columns: cols }) => useGrid({ data, columns: cols }),
      { initialProps: { columns: cols1 } },
    );

    expect(result.current.columns).toHaveLength(1);

    rerender({ columns: cols2 });

    expect(result.current.columns).toHaveLength(2);
  });

  it("returns a stable reference when re-rendered with same options", () => {
    const data = makeData("Alice");
    const options = { data, columns };

    const { result, rerender } = renderHook(() => useGrid(options));

    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("provides stable updater function references across re-renders", () => {
    const data = makeData("Alice");
    const { result, rerender } = renderHook(() => useGrid({ data, columns }));

    const { toggleSort, setSorting, setColumnFilter, setColumnFilters } = result.current;

    rerender();

    expect(result.current.toggleSort).toBe(toggleSort);
    expect(result.current.setSorting).toBe(setSorting);
    expect(result.current.setColumnFilter).toBe(setColumnFilter);
    expect(result.current.setColumnFilters).toBe(setColumnFilters);
  });

  it("cycles toggleSort through asc → desc → removed", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    expect(result.current.sorting).toEqual([]);

    act(() => result.current.toggleSort("name"));
    expect(result.current.sorting).toEqual([{ columnId: "name", direction: "asc" }]);

    act(() => result.current.toggleSort("name"));
    expect(result.current.sorting).toEqual([{ columnId: "name", direction: "desc" }]);

    act(() => result.current.toggleSort("name"));
    expect(result.current.sorting).toEqual([]);
  });

  it("filters rows when setColumnFilter is called", () => {
    const data = makeData("Alice", "Bob", "Carol");
    const { result } = renderHook(() => useGrid({ data, columns }));

    expect(result.current.rows).toHaveLength(3);

    act(() => result.current.setColumnFilter("name", "ob"));
    expect(result.current.rows).toHaveLength(1);
    expect(leafRows(result.current.rows)[0]?.original.name).toBe("Bob");

    // Clear filter
    act(() => result.current.setColumnFilter("name", ""));
    expect(result.current.rows).toHaveLength(3);
  });

  it("preserves column model reference when only sorting changes", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    const columnsBefore = result.current.columns;

    act(() => result.current.toggleSort("name"));

    // Column model should be the same reference — it doesn't depend on sorting
    expect(result.current.columns).toBe(columnsBefore);
  });

  it("preserves column model reference when only filters change", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    const columnsBefore = result.current.columns;

    act(() => result.current.setColumnFilter("name", "Ali"));

    // Column model should be the same reference — it doesn't depend on filters
    expect(result.current.columns).toBe(columnsBefore);
  });

  it("produces correctly sorted rows", () => {
    const data = makeData("Charlie", "Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    act(() => result.current.toggleSort("name"));

    const names = leafRows(result.current.rows).map((r) => r.original.name);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);

    act(() => result.current.toggleSort("name"));

    const namesDesc = leafRows(result.current.rows).map((r) => r.original.name);
    expect(namesDesc).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("row getValue returns correct column values", () => {
    const data = makeData("Alice");
    const { result } = renderHook(() => useGrid({ data, columns }));

    const row = leafRows(result.current.rows)[0];
    expect(row?.getValue("name")).toBe("Alice");
    expect(row?.getValue("age")).toBe(20);
  });

  it("all rows have type='leaf' when no grouping", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    for (const row of result.current.rows) {
      expect(row.type).toBe("leaf");
    }
  });

  describe("column sizing", () => {
    it("columns include default widths", () => {
      const data = makeData("Alice");
      const { result } = renderHook(() => useGrid({ data, columns }));

      for (const col of result.current.columns) {
        expect(col.width).toBe(150);
        expect(col.minWidth).toBe(50);
        expect(col.maxWidth).toBe(Number.POSITIVE_INFINITY);
      }
    });

    it("columns include explicit widths from ColumnDef", () => {
      const data = makeData("Alice");
      const cols: ColumnDef<Person>[] = [
        {
          id: "name",
          accessorKey: "name",
          header: "Name",
          width: 200,
          minWidth: 100,
          maxWidth: 400,
        },
        { id: "age", accessorKey: "age", header: "Age", width: 80 },
      ];
      const { result } = renderHook(() => useGrid({ data, columns: cols }));

      expect(result.current.columns[0]?.width).toBe(200);
      expect(result.current.columns[0]?.minWidth).toBe(100);
      expect(result.current.columns[0]?.maxWidth).toBe(400);
      expect(result.current.columns[1]?.width).toBe(80);
    });

    it("exposes totalWidth as sum of column widths", () => {
      const data = makeData("Alice");
      const cols: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", width: 200 },
        { id: "age", accessorKey: "age", header: "Age", width: 100 },
      ];
      const { result } = renderHook(() => useGrid({ data, columns: cols }));

      expect(result.current.totalWidth).toBe(300);
    });

    it("setColumnWidth updates a column width and clamps to min/max", () => {
      const data = makeData("Alice");
      const cols: ColumnDef<Person>[] = [
        {
          id: "name",
          accessorKey: "name",
          header: "Name",
          width: 200,
          minWidth: 100,
          maxWidth: 400,
        },
        { id: "age", accessorKey: "age", header: "Age", width: 100 },
      ];
      const { result } = renderHook(() => useGrid({ data, columns: cols }));

      // Set within range
      act(() => result.current.setColumnWidth("name", 300));
      expect(result.current.columns[0]?.width).toBe(300);
      expect(result.current.totalWidth).toBe(400);

      // Clamp below min
      act(() => result.current.setColumnWidth("name", 50));
      expect(result.current.columns[0]?.width).toBe(100);

      // Clamp above max
      act(() => result.current.setColumnWidth("name", 500));
      expect(result.current.columns[0]?.width).toBe(400);
    });

    it("setColumnWidth is a stable function reference", () => {
      const data = makeData("Alice");
      const { result, rerender } = renderHook(() => useGrid({ data, columns }));

      const fn = result.current.setColumnWidth;
      rerender();
      expect(result.current.setColumnWidth).toBe(fn);
    });

    it("prunes stale width overrides when columnDefs change", () => {
      const data = makeData("Alice");
      const cols1: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", width: 200 },
        { id: "age", accessorKey: "age", header: "Age", width: 100 },
      ];
      const cols2: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name", width: 200 },
      ];

      const { result, rerender } = renderHook(({ columns: c }) => useGrid({ data, columns: c }), {
        initialProps: { columns: cols1 },
      });

      // Set a width override on the "age" column
      act(() => result.current.setColumnWidth("age", 250));
      expect(result.current.columns[1]?.width).toBe(250);

      // Remove "age" column — the override should not cause issues
      rerender({ columns: cols2 });
      expect(result.current.columns).toHaveLength(1);
      expect(result.current.columns[0]?.id).toBe("name");
      expect(result.current.columns[0]?.width).toBe(200);
    });
  });

  describe("grouping", () => {
    const deptColumns: ColumnDef<Person>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "age", accessorKey: "age", header: "Age" },
      { id: "department", accessorKey: "department", header: "Department" },
    ];

    const deptData: Person[] = [
      { name: "Alice", age: 30, department: "Engineering" },
      { name: "Bob", age: 25, department: "Sales" },
      { name: "Carol", age: 28, department: "Engineering" },
      { name: "Dave", age: 35, department: "Sales" },
    ];

    it("produces GroupRow + LeafRow types when grouping is set", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      act(() => result.current.setGrouping(["department"]));

      const groups = result.current.rows.filter((r): r is GroupRow => r.type === "group");
      const leaves = leafRows(result.current.rows);

      expect(groups).toHaveLength(2);
      expect(leaves).toHaveLength(4);
      expect(groups[0]?.groupValue).toBe("Engineering");
      expect(groups[1]?.groupValue).toBe("Sales");
    });

    it("toggleGroupExpansion collapses and expands groups", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      act(() => result.current.setGrouping(["department"]));
      // 2 groups + 4 leaves = 6
      expect(result.current.rows).toHaveLength(6);

      // Collapse Engineering
      const engGroup = result.current.rows.find(
        (r): r is GroupRow => r.type === "group" && r.groupValue === "Engineering",
      );
      expect(engGroup).toBeDefined();
      const engGroupId = engGroup?.groupId ?? "";
      act(() => result.current.toggleGroupExpansion(engGroupId));

      // Engineering collapsed: 2 groups + 2 Sales leaves = 4
      expect(result.current.rows).toHaveLength(4);

      // Expand again
      act(() => result.current.toggleGroupExpansion(engGroupId));
      expect(result.current.rows).toHaveLength(6);
    });

    it("setGrouping clears selection", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      // Select a cell
      act(() => result.current.selectCell({ rowIndex: 0, columnIndex: 0 }));
      expect(result.current.focusedCell).not.toBeNull();

      // Set grouping should clear selection
      act(() => result.current.setGrouping(["department"]));
      expect(result.current.focusedCell).toBeNull();
      expect(result.current.selectedRanges).toEqual([]);
    });

    it("grouping + sorting works together", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      // Sort by name ascending first
      act(() => result.current.toggleSort("name"));
      // Then group by department
      act(() => result.current.setGrouping(["department"]));

      const leaves = leafRows(result.current.rows);
      // Within Engineering group: Alice, Carol (sorted)
      const engLeaves = leaves.filter((r) => r.original.department === "Engineering");
      expect(engLeaves.map((r) => r.original.name)).toEqual(["Alice", "Carol"]);

      // Within Sales group: Bob, Dave (sorted)
      const salesLeaves = leaves.filter((r) => r.original.department === "Sales");
      expect(salesLeaves.map((r) => r.original.name)).toEqual(["Bob", "Dave"]);
    });

    it("grouping + filtering works together", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      act(() => result.current.setGrouping(["department"]));
      // Filter to only name containing "ob" (Bob)
      act(() => result.current.setColumnFilter("name", "ob"));

      const groups = result.current.rows.filter((r): r is GroupRow => r.type === "group");
      const leaves = leafRows(result.current.rows);

      // Only Sales group should remain (Bob)
      expect(groups).toHaveLength(1);
      expect(groups[0]?.groupValue).toBe("Sales");
      expect(leaves).toHaveLength(1);
      expect(leaves[0]?.original.name).toBe("Bob");
    });

    it("clearing grouping returns to flat leaf rows", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      act(() => result.current.setGrouping(["department"]));
      expect(result.current.rows.some((r) => r.type === "group")).toBe(true);

      act(() => result.current.setGrouping([]));
      expect(result.current.rows.every((r) => r.type === "leaf")).toBe(true);
      expect(result.current.rows).toHaveLength(4);
    });

    it("expandAllGroups and collapseAllGroups work", () => {
      const { result } = renderHook(() => useGrid({ data: deptData, columns: deptColumns }));

      act(() => result.current.setGrouping(["department"]));

      // Collapse all
      act(() => result.current.collapseAllGroups());
      // Only 2 group headers
      expect(result.current.rows).toHaveLength(2);
      expect(result.current.rows.every((r) => r.type === "group")).toBe(true);

      // Expand all
      act(() => result.current.expandAllGroups());
      expect(result.current.rows).toHaveLength(6);
    });
  });

  describe("aggregation", () => {
    const aggColumns: ColumnDef<Person>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "age", accessorKey: "age", header: "Age", aggFunc: "sum" },
      { id: "department", accessorKey: "department", header: "Department" },
    ];

    const aggData: Person[] = [
      { name: "Alice", age: 30, department: "Engineering" },
      { name: "Bob", age: 25, department: "Sales" },
      { name: "Carol", age: 28, department: "Engineering" },
      { name: "Dave", age: 35, department: "Sales" },
    ];

    it("group rows have aggregatedValues when columns have aggFunc", () => {
      const { result } = renderHook(() =>
        useGrid({ data: aggData, columns: aggColumns, grouping: ["department"] }),
      );

      const groups = result.current.rows.filter((r): r is GroupRow => r.type === "group");
      expect(groups).toHaveLength(2);

      const eng = groups.find((g) => g.groupValue === "Engineering");
      expect(eng?.aggregatedValues.age).toBe(58); // 30 + 28

      const sales = groups.find((g) => g.groupValue === "Sales");
      expect(sales?.aggregatedValues.age).toBe(60); // 25 + 35
    });

    it("filter changes recalculate aggregated values", () => {
      const { result } = renderHook(() =>
        useGrid({ data: aggData, columns: aggColumns, grouping: ["department"] }),
      );

      // Before filter: Engineering = 58
      let groups = result.current.rows.filter((r): r is GroupRow => r.type === "group");
      let eng = groups.find((g) => g.groupValue === "Engineering");
      expect(eng?.aggregatedValues.age).toBe(58);

      // Filter to only Alice
      act(() => result.current.setColumnFilter("name", "Alice"));
      groups = result.current.rows.filter((r): r is GroupRow => r.type === "group");
      eng = groups.find((g) => g.groupValue === "Engineering");
      expect(eng?.aggregatedValues.age).toBe(30);
    });

    it("no aggregation when no columns have aggFunc", () => {
      const noAggColumns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name", header: "Name" },
        { id: "age", accessorKey: "age", header: "Age" },
        { id: "department", accessorKey: "department", header: "Department" },
      ];

      const { result } = renderHook(() =>
        useGrid({ data: aggData, columns: noAggColumns, grouping: ["department"] }),
      );

      const groups = result.current.rows.filter((r): r is GroupRow => r.type === "group");
      for (const g of groups) {
        expect(g.aggregatedValues).toEqual({});
      }
    });
  });

  describe("group display types", () => {
    const deptColumns: ColumnDef<Person>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
      { id: "age", accessorKey: "age", header: "Age" },
      { id: "department", accessorKey: "department", header: "Department" },
    ];

    const deptData: Person[] = [
      { name: "Alice", age: 30, department: "Engineering" },
      { name: "Bob", age: 25, department: "Sales" },
      { name: "Carol", age: 28, department: "Engineering" },
      { name: "Dave", age: 35, department: "Sales" },
    ];

    it("groupRows (default) does not add group columns", () => {
      const { result } = renderHook(() =>
        useGrid({ data: deptData, columns: deptColumns, grouping: ["department"] }),
      );
      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns.every((c) => c.groupFor === undefined)).toBe(true);
    });

    it("singleColumn prepends one group column when grouping active", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: ["department"],
          groupDisplayType: "singleColumn",
        }),
      );
      // 1 group column + 2 visible data columns (department hidden by default)
      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns[0]?.id).toBe("qigrid:group");
      expect(result.current.columns[0]?.groupFor).toBe("*");
    });

    it("multipleColumns prepends N columns per grouping level", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: ["department"],
          groupDisplayType: "multipleColumns",
        }),
      );
      // 1 group column + 2 visible data columns (department hidden by default)
      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns[0]?.id).toBe("qigrid:group:department");
      expect(result.current.columns[0]?.groupFor).toBe("department");
    });

    it("hideGroupedColumns=false keeps grouped data columns", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: ["department"],
          groupDisplayType: "singleColumn",
          hideGroupedColumns: false,
        }),
      );
      // 1 group column + 3 data columns
      expect(result.current.columns).toHaveLength(4);
      expect(result.current.columns.map((c) => c.id)).toEqual([
        "qigrid:group",
        "name",
        "age",
        "department",
      ]);
    });

    it("hideGroupedColumns removes grouped data columns", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: ["department"],
          groupDisplayType: "singleColumn",
          hideGroupedColumns: true,
        }),
      );
      // 1 group column + 2 visible data columns (no department)
      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns.map((c) => c.id)).toEqual(["qigrid:group", "name", "age"]);
    });

    it("totalWidth includes group column widths", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: ["department"],
          groupDisplayType: "singleColumn",
          hideGroupedColumns: false,
        }),
      );
      // 200 (group) + 150*3 (data) = 650
      expect(result.current.totalWidth).toBe(650);
    });

    it("setColumnWidth works for group column IDs", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: ["department"],
          groupDisplayType: "singleColumn",
        }),
      );

      act(() => result.current.setColumnWidth("qigrid:group", 300));
      expect(result.current.columns[0]?.width).toBe(300);
    });

    it("empty grouping with non-groupRows display type returns no group columns", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          grouping: [],
          groupDisplayType: "singleColumn",
        }),
      );
      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns.every((c) => c.groupFor === undefined)).toBe(true);
    });

    it("exposes groupDisplayType on return value", () => {
      const { result } = renderHook(() =>
        useGrid({
          data: deptData,
          columns: deptColumns,
          groupDisplayType: "multipleColumns",
        }),
      );
      expect(result.current.groupDisplayType).toBe("multipleColumns");
    });
  });

  describe("selection and anchor navigation", () => {
    it("exposes selectionAnchor reflecting state", () => {
      const data = makeData("Alice", "Bob", "Carol");
      const { result } = renderHook(() => useGrid({ data, columns }));

      expect(result.current.selectionAnchor).toBeNull();

      act(() => result.current.selectCell({ rowIndex: 1, columnIndex: 1 }));
      expect(result.current.selectionAnchor).toEqual({ rowIndex: 1, columnIndex: 1 });
    });

    it("arrow key after drag selection navigates from anchor", () => {
      const data = makeData("Alice", "Bob", "Carol");
      const { result } = renderHook(() => useGrid({ data, columns }));

      // Select cell (1,1) as anchor
      act(() => result.current.selectCell({ rowIndex: 1, columnIndex: 1 }));
      // Drag-extend to (2,1)
      act(() => result.current.extendSelection({ rowIndex: 2, columnIndex: 1 }));

      expect(result.current.selectionAnchor).toEqual({ rowIndex: 1, columnIndex: 1 });
      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 1 });

      // Press ArrowDown (non-shift) — should navigate from anchor (1,1), landing at (2,1)
      act(() => result.current.moveFocus(1, 0));
      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 1 });
      // Selection collapses to the new cell
      expect(result.current.selectedRanges).toEqual([
        { start: { rowIndex: 2, columnIndex: 1 }, end: { rowIndex: 2, columnIndex: 1 } },
      ]);
    });

    it("arrow key after larger drag navigates from anchor column too", () => {
      const data = makeData("Alice", "Bob", "Carol");
      const { result } = renderHook(() => useGrid({ data, columns }));

      // Select cell (0,0) as anchor
      act(() => result.current.selectCell({ rowIndex: 0, columnIndex: 0 }));
      // Drag-extend to (2,1)
      act(() => result.current.extendSelection({ rowIndex: 2, columnIndex: 1 }));

      // Press ArrowRight (non-shift) — from anchor (0,0) → (0,1)
      act(() => result.current.moveFocus(0, 1));
      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 1 });
    });

    it("shift+arrow still extends from anchor correctly", () => {
      const data = makeData("Alice", "Bob", "Carol");
      const { result } = renderHook(() => useGrid({ data, columns }));

      // Select cell (1,0) as anchor
      act(() => result.current.selectCell({ rowIndex: 1, columnIndex: 0 }));
      // Shift+ArrowDown — extend from anchor to (2,0)
      act(() => result.current.moveFocus(1, 0, true));

      expect(result.current.selectionAnchor).toEqual({ rowIndex: 1, columnIndex: 0 });
      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 0 });
      expect(result.current.selectedRanges).toEqual([
        { start: { rowIndex: 1, columnIndex: 0 }, end: { rowIndex: 2, columnIndex: 0 } },
      ]);
    });
  });
});
