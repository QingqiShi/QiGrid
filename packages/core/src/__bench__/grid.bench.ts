import { bench, describe } from "vitest";
import { buildColumnModel } from "../columns";
import { createGrid } from "../createGrid";
import { filterRows } from "../filtering";
import { buildRowModel } from "../rowModel";
import { sortRows } from "../sorting";
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

describe("buildColumnModel", () => {
  bench("buildColumnModel with 5 columns", () => {
    buildColumnModel(columns);
  });
});

describe("sorting 100k rows (pure)", () => {
  const rows100k = buildRowModel(data100k, columns, [], []);

  bench("sortRows by string column (name)", () => {
    sortRows(rows100k, [{ columnId: "name", direction: "asc" }], columns);
  });

  bench("sortRows by numeric column (salary)", () => {
    sortRows(rows100k, [{ columnId: "salary", direction: "asc" }], columns);
  });
});

describe("filtering 100k rows (pure)", () => {
  bench("filterRows by string includes (name contains 'Alice')", () => {
    filterRows(data100k, [{ columnId: "name", value: "Alice" }], columns);
  });

  bench("filterRows by string equality (department)", () => {
    filterRows(data100k, [{ columnId: "department", value: "Engineering" }], columns);
  });

  bench("filterRows by numeric range (salary >= 80000)", () => {
    const customColumns: ColumnDef<Employee>[] = [
      {
        id: "salary",
        accessorKey: "salary",
        header: "Salary",
        filterFn: (value, filterValue) => (value as number) >= (filterValue as number),
      },
    ];
    filterRows(data100k, [{ columnId: "salary", value: 80000 }], customColumns);
  });
});

describe("full pipeline 100k rows (pure)", () => {
  bench("buildRowModel with filter + sort", () => {
    buildRowModel(
      data100k,
      columns,
      [{ columnId: "department", value: "Engineering" }],
      [{ columnId: "name", direction: "asc" }],
    );
  });
});
