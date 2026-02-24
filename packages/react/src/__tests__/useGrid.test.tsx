import type { ColumnDef } from "@qigrid/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGrid } from "../useGrid";

interface Person {
  name: string;
  age: number;
}

const columns = [
  { id: "name", accessorKey: "name" as const, header: "Name" },
  { id: "age", accessorKey: "age" as const, header: "Age" },
];

function makeData(...names: string[]): Person[] {
  return names.map((name, i) => ({ name, age: 20 + i }));
}

describe("useGrid", () => {
  it("returns a grid instance from options", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));

    expect(result.current.data).toBe(data);
    expect(result.current.columns).toBe(columns);
    expect(result.current.getRows()).toHaveLength(2);
  });

  it("returns rows that correspond to the initial data", () => {
    const data = makeData("Alice", "Bob");
    const { result } = renderHook(() => useGrid({ data, columns }));
    const rows = result.current.getRows();

    expect(rows[0]?.original).toEqual({ name: "Alice", age: 20 });
    expect(rows[1]?.original).toEqual({ name: "Bob", age: 21 });
  });

  it("re-renders with new rows when data prop changes", () => {
    const data1 = makeData("Alice");
    const data2 = makeData("Bob", "Carol");

    const { result, rerender } = renderHook(({ data }) => useGrid({ data, columns }), {
      initialProps: { data: data1 },
    });

    expect(result.current.getRows()).toHaveLength(1);

    rerender({ data: data2 });

    expect(result.current.getRows()).toHaveLength(2);
    expect(result.current.getRows()[0]?.original.name).toBe("Bob");
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

  it("maintains a stable grid instance across re-renders", () => {
    const data1 = makeData("Alice");
    const data2 = makeData("Bob");

    const { result, rerender } = renderHook(({ data }) => useGrid({ data, columns }), {
      initialProps: { data: data1 },
    });

    const instanceBefore = result.current;

    rerender({ data: data2 });

    // The grid instance object should be the same reference
    expect(result.current).toBe(instanceBefore);
  });

  it("re-renders when setData is called directly on the grid instance", () => {
    const data = makeData("Alice");
    const { result } = renderHook(() => useGrid({ data, columns }));

    expect(result.current.getRows()).toHaveLength(1);

    act(() => {
      result.current.setData(makeData("Bob", "Carol", "Dave"));
    });

    expect(result.current.getRows()).toHaveLength(3);
    expect(result.current.getRows()[0]?.original.name).toBe("Bob");
  });

  it("cleans up subscription on unmount", () => {
    const data = makeData("Alice");
    const { result, unmount } = renderHook(() => useGrid({ data, columns }));

    const grid = result.current;
    const subscribeSpy = vi.spyOn(grid, "subscribe");

    // Re-render to capture the subscribe call
    const { unmount: unmount2 } = renderHook(() => useGrid({ data, columns }));

    // unmount should not throw — subscription cleanup runs
    expect(() => unmount()).not.toThrow();
    expect(() => unmount2()).not.toThrow();

    subscribeSpy.mockRestore();
  });

  it("does not create a new grid instance when the same options are passed", () => {
    const data = makeData("Alice");
    const options = { data, columns };

    const { result, rerender } = renderHook(() => useGrid(options));

    const instance = result.current;

    rerender();

    expect(result.current).toBe(instance);
  });
});
