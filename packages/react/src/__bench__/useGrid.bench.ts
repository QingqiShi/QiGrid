import type { ColumnDef } from "@qigrid/core";
import { renderHook } from "@testing-library/react";
import { bench, describe } from "vitest";
import { useGrid } from "../useGrid";

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

function generateEmployees(count: number): Employee[] {
  const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance"];
  const rows: Employee[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: i,
      name: `Employee ${i}`,
      department: departments[i % departments.length] as string,
      salary: 40000 + (i % 100) * 1000,
    });
  }
  return rows;
}

const columns: ColumnDef<Employee>[] = [
  { id: "id", accessorKey: "id", header: "ID" },
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "salary", accessorKey: "salary", header: "Salary" },
];

describe("useGrid mount", () => {
  bench("mount with 100 rows", () => {
    const data = generateEmployees(100);
    const { unmount } = renderHook(() => useGrid({ data, columns }));
    unmount();
  });

  bench("mount with 1,000 rows", () => {
    const data = generateEmployees(1_000);
    const { unmount } = renderHook(() => useGrid({ data, columns }));
    unmount();
  });

  bench("mount with 10,000 rows", () => {
    const data = generateEmployees(10_000);
    const { unmount } = renderHook(() => useGrid({ data, columns }));
    unmount();
  });
});

describe("useGrid update", () => {
  bench("rerender with new data (1,000 rows)", () => {
    const data1 = generateEmployees(1_000);
    const data2 = generateEmployees(1_000);
    const { rerender, unmount } = renderHook(({ data }) => useGrid({ data, columns }), {
      initialProps: { data: data1 },
    });
    rerender({ data: data2 });
    unmount();
  });

  bench("rerender with new data (10,000 rows)", () => {
    const data1 = generateEmployees(10_000);
    const data2 = generateEmployees(10_000);
    const { rerender, unmount } = renderHook(({ data }) => useGrid({ data, columns }), {
      initialProps: { data: data1 },
    });
    rerender({ data: data2 });
    unmount();
  });
});
