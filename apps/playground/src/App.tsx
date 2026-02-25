import type { Column, ColumnDef, SortingState } from "@qigrid/react";
import { useGrid } from "@qigrid/react";
import { useMemo } from "react";
import { type Employee, generateEmployees } from "./data";
import "./grid.css";

const data = generateEmployees(100);

const columns: ColumnDef<Employee>[] = [
  { id: "id", accessorKey: "id", header: "ID" },
  { id: "firstName", accessorKey: "firstName", header: "First Name" },
  { id: "lastName", accessorKey: "lastName", header: "Last Name" },
  { id: "email", accessorKey: "email", header: "Email" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "jobTitle", accessorKey: "jobTitle", header: "Job Title" },
  {
    id: "salary",
    accessorKey: "salary",
    header: "Salary",
  },
  { id: "startDate", accessorKey: "startDate", header: "Start Date" },
  { id: "location", accessorKey: "location", header: "Location" },
];

/** Map department names to subtle background colors for badges */
const deptColors: Record<string, string> = {
  Engineering: "#dbeafe",
  Product: "#fce7f3",
  Design: "#ede9fe",
  Marketing: "#fef3c7",
  Sales: "#d1fae5",
  Finance: "#e0e7ff",
  "Human Resources": "#fce4ec",
  Operations: "#fff3e0",
  Legal: "#f3e5f5",
  "Customer Support": "#e0f2f1",
};

function formatSalary(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function getSortIndicator(sorting: SortingState, columnId: string): string {
  const sort = sorting.find((s) => s.columnId === columnId);
  if (sort === undefined) return "";
  return sort.direction === "asc" ? " \u2191" : " \u2193";
}

function CellValue({ col, value }: { col: Column<Employee>; value: unknown }) {
  const str = String(value);

  switch (col.id) {
    case "id":
      return <span className="cell-id">{str}</span>;
    case "email":
      return <span className="cell-email">{str}</span>;
    case "salary":
      return <span className="cell-salary">{formatSalary(value as number)}</span>;
    case "startDate":
      return <span className="cell-date">{str}</span>;
    case "department":
      return (
        <span
          style={{
            background: deptColors[str] ?? "#f1f5f9",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {str}
        </span>
      );
    default:
      return <>{str}</>;
  }
}

export function App() {
  const options = useMemo(() => ({ data, columns }), []);
  const grid = useGrid(options);
  const { rows, columns: cols, sorting, data: gridData, toggleSort, setColumnFilter } = grid;
  const totalRows = gridData.length;

  return (
    <div className="playground">
      <h1>QiGrid Playground</h1>
      <p className="subtitle">
        Showing {rows.length} of {totalRows} rows via <code>@qigrid/react</code> &rarr;{" "}
        <code>@qigrid/core</code>
      </p>

      <div className="grid-container">
        <div className="grid-info">
          {cols.length} columns &middot; Showing {rows.length} of {totalRows} rows
        </div>
        <div className="grid-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                {cols.map((col) => (
                  <th key={col.id} className="sortable-header" onClick={() => toggleSort(col.id)}>
                    {col.header}
                    <span className="sort-indicator">{getSortIndicator(sorting, col.id)}</span>
                  </th>
                ))}
              </tr>
              <tr className="filter-row">
                {cols.map((col) => (
                  <th key={`filter-${col.id}`} className="filter-cell">
                    <input
                      type="text"
                      className="filter-input"
                      placeholder={`Filter ${col.header}...`}
                      aria-label={`Filter ${col.header}`}
                      data-column-id={col.id}
                      onChange={(e) => {
                        setColumnFilter(col.id, e.target.value);
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index}>
                  {cols.map((col) => {
                    const value =
                      col.accessorKey != null
                        ? row.original[col.accessorKey]
                        : col.accessorFn
                          ? col.accessorFn(row.original)
                          : "";
                    return (
                      <td key={col.id}>
                        <CellValue col={col} value={value} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
