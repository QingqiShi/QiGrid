import { bench, describe } from "vitest";
import { createGrid } from "../createGrid";
import type { ColumnDef } from "../types";

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  startDate: string;
}

function generateEmployees(count: number): Employee[] {
  const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance"];
  const firstNames = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank"];
  const lastNames = ["Smith", "Jones", "Brown", "Davis", "Wilson", "Moore", "Taylor", "Clark"];

  const rows: Employee[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: i,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      department: departments[i % departments.length] as string,
      salary: 40000 + (i % 100) * 1000,
      startDate: `2020-${String((i % 12) + 1).padStart(2, "0")}-01`,
    });
  }
  return rows;
}

const columns: ColumnDef<Employee>[] = [
  { id: "id", accessorKey: "id", header: "ID" },
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "salary", accessorKey: "salary", header: "Salary" },
  { id: "startDate", accessorKey: "startDate", header: "Start Date" },
];

const data100k = generateEmployees(100_000);

describe("grid instance creation", () => {
  bench("createGrid with 100 rows", () => {
    const data = data100k.slice(0, 100);
    createGrid({ data, columns });
  });

  bench("createGrid with 10,000 rows", () => {
    const data = data100k.slice(0, 10_000);
    createGrid({ data, columns });
  });

  bench("createGrid with 100,000 rows", () => {
    createGrid({ data: data100k, columns });
  });
});

describe("getRows materialization", () => {
  const grid100 = createGrid({ data: data100k.slice(0, 100), columns });
  const grid10k = createGrid({ data: data100k.slice(0, 10_000), columns });
  const grid100k = createGrid({ data: data100k, columns });

  bench("getRows with 100 rows", () => {
    grid100.getRows();
  });

  bench("getRows with 10,000 rows", () => {
    grid10k.getRows();
  });

  bench("getRows with 100,000 rows", () => {
    grid100k.getRows();
  });
});

describe("sorting 100k rows", () => {
  // Sort benchmarks operate on getRows() output to measure data transformation cost.
  // Once core sorting is implemented, these should be replaced with grid.sort() calls.
  const grid = createGrid({ data: data100k, columns });

  bench("sort by string column (name)", () => {
    const rows = grid.getRows();
    rows.sort((a, b) => a.original.name.localeCompare(b.original.name));
  });

  bench("sort by numeric column (salary)", () => {
    const rows = grid.getRows();
    rows.sort((a, b) => a.original.salary - b.original.salary);
  });
});

describe("filtering 100k rows", () => {
  // Filter benchmarks operate on getRows() output to measure data transformation cost.
  // Once core filtering is implemented, these should be replaced with grid.filter() calls.
  const grid = createGrid({ data: data100k, columns });

  bench("filter by string equality (department)", () => {
    const rows = grid.getRows();
    rows.filter((r) => r.original.department === "Engineering");
  });

  bench("filter by numeric range (salary > 80000)", () => {
    const rows = grid.getRows();
    rows.filter((r) => r.original.salary > 80000);
  });

  bench("filter by string includes (name contains 'Alice')", () => {
    const rows = grid.getRows();
    rows.filter((r) => r.original.name.includes("Alice"));
  });
});
