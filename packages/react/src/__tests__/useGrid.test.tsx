import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGrid } from "../useGrid";

interface Person {
  name: string;
  age: number;
}

describe("useGrid", () => {
  it("returns a grid instance from options", () => {
    const data: Person[] = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const columns = [
      { id: "name", accessorKey: "name" as const, header: "Name" },
      { id: "age", accessorKey: "age" as const, header: "Age" },
    ];

    const { result } = renderHook(() => useGrid({ data, columns }));

    expect(result.current.data).toBe(data);
    expect(result.current.columns).toBe(columns);
    expect(result.current.getRows()).toHaveLength(2);
  });
});
