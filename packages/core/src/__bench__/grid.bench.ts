import { bench, describe } from "vitest";
import { buildColumnModel } from "../columns";
import { filterRows } from "../filtering";
import { flattenGroupedRows, groupRows } from "../grouping";
import { sortRows } from "../sorting";
import type { ColumnDef, Row } from "../types";
import { computeVirtualRange, sliceVisibleRows } from "../virtualization";

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

const columnDefs: ColumnDef<Employee>[] = [
  { id: "id", accessorKey: "id", header: "ID" },
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "salary", accessorKey: "salary", header: "Salary" },
  { id: "startDate", accessorKey: "startDate", header: "Start Date" },
];

const columns = buildColumnModel(columnDefs);
const data100k = generateEmployees(100_000);

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

describe("buildColumnModel", () => {
  bench("buildColumnModel with 5 columns", () => {
    buildColumnModel(columnDefs);
  });
});

describe("sorting 100k rows (pure)", () => {
  const rows100k = makeRows(data100k);

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
    const customDefs: ColumnDef<Employee>[] = [
      {
        id: "salary",
        accessorKey: "salary",
        header: "Salary",
        filterFn: (value, filterValue) => (value as number) >= (filterValue as number),
      },
    ];
    filterRows(data100k, [{ columnId: "salary", value: 80000 }], buildColumnModel(customDefs));
  });
});

describe("full pipeline 100k rows (pure)", () => {
  bench("filter + wrap + sort", () => {
    const filtered = filterRows(
      data100k,
      [{ columnId: "department", value: "Engineering" }],
      columns,
    );
    const rows = makeRows(filtered);
    sortRows(rows, [{ columnId: "name", direction: "asc" }], columns);
  });
});

// Virtualization benchmarks — lightweight row factory for 1M rows
const rows1M: Row<{ id: number }>[] = Array.from({ length: 1_000_000 }, (_, i) => ({
  index: i,
  original: { id: i },
  getValue: () => i,
}));

describe("computeVirtualRange 1M rows", () => {
  bench("at top", () => {
    computeVirtualRange({
      totalRowCount: 1_000_000,
      scrollTop: 0,
      containerHeight: 600,
      rowHeight: 36,
    });
  });

  bench("at middle", () => {
    computeVirtualRange({
      totalRowCount: 1_000_000,
      scrollTop: 18_000_000,
      containerHeight: 600,
      rowHeight: 36,
    });
  });

  bench("at bottom", () => {
    computeVirtualRange({
      totalRowCount: 1_000_000,
      scrollTop: 35_999_400,
      containerHeight: 600,
      rowHeight: 36,
    });
  });
});

describe("sliceVisibleRows 1M rows", () => {
  const range = computeVirtualRange({
    totalRowCount: 1_000_000,
    scrollTop: 18_000_000,
    containerHeight: 600,
    rowHeight: 36,
  });

  bench("slice from middle", () => {
    sliceVisibleRows(rows1M, range);
  });
});

describe("groupRows 100k rows", () => {
  const rows100k = makeRows(data100k);

  bench("group by single column (department)", () => {
    groupRows(rows100k, ["department"], columns);
  });
});

describe("flattenGroupedRows 100k rows", () => {
  const rows100k = makeRows(data100k);
  const grouped = groupRows(rows100k, ["department"], columns);
  const noCollapsed = new Set<string>();

  bench("flatten all expanded", () => {
    flattenGroupedRows(grouped, noCollapsed);
  });
});
