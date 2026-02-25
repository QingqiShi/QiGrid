import type { ColumnDef } from "@qigrid/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGrid } from "../useGrid";

interface Person {
  name: string;
  age: number;
}

const columns: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name" as const, header: "Name" },
  { id: "age", accessorKey: "age" as const, header: "Age" },
];

function makeData(...names: string[]): Person[] {
  return names.map((name, i) => ({ name, age: 20 + i }));
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

    expect(result.current.rows[0]?.original).toEqual({ name: "Alice", age: 20 });
    expect(result.current.rows[1]?.original).toEqual({ name: "Bob", age: 21 });
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
    expect(result.current.rows[0]?.original.name).toBe("Bob");
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
    expect(result.current.rows[0]?.original.name).toBe("Bob");

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

    const names = result.current.rows.map((r) => r.original.name);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);

    act(() => result.current.toggleSort("name"));

    const namesDesc = result.current.rows.map((r) => r.original.name);
    expect(namesDesc).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("row getValue returns correct column values", () => {
    const data = makeData("Alice");
    const { result } = renderHook(() => useGrid({ data, columns }));

    const row = result.current.rows[0];
    expect(row?.getValue("name")).toBe("Alice");
    expect(row?.getValue("age")).toBe(20);
  });
});
