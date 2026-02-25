import type { Column, ColumnDef, SortingState, VirtualRange } from "@qigrid/react";
import { useGrid, VirtualGrid } from "@qigrid/react";
import { useCallback, useMemo, useState } from "react";
import { type Employee, generateEmployees } from "./data";
import "./grid.css";

const data = generateEmployees(10_000);

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 600;

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
  const {
    rows,
    columns: cols,
    totalWidth,
    sorting,
    data: gridData,
    toggleSort,
    setColumnFilter,
  } = grid;
  const totalRows = gridData.length;

  const [virtualRange, setVirtualRange] = useState<VirtualRange | null>(null);

  const renderCell = useCallback((row: (typeof rows)[number], column: (typeof cols)[number]) => {
    const value =
      column.accessorKey != null
        ? row.original[column.accessorKey]
        : column.accessorFn
          ? column.accessorFn(row.original)
          : "";
    return <CellValue col={column} value={value} />;
  }, []);

  const renderHeaderCell = useCallback(
    (column: (typeof cols)[number]) => (
      <button type="button" className="sortable-header" onClick={() => toggleSort(column.id)}>
        {column.header}
        <span className="sort-indicator">{getSortIndicator(sorting, column.id)}</span>
      </button>
    ),
    [sorting, toggleSort],
  );

  const renderFilterCell = useCallback(
    (column: (typeof cols)[number]) => (
      <input
        type="text"
        className="filter-input"
        placeholder={`Filter ${column.header}...`}
        aria-label={`Filter ${column.header}`}
        data-column-id={column.id}
        onChange={(e) => {
          setColumnFilter(column.id, e.target.value);
        }}
      />
    ),
    [setColumnFilter],
  );

  const visibleStart = virtualRange ? virtualRange.startIndex + 1 : 0;
  const visibleEnd = virtualRange ? virtualRange.endIndex : 0;

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
          {virtualRange && (
            <>
              {" "}
              &middot; Visible rows {visibleStart}-{visibleEnd} of {rows.length}
            </>
          )}
        </div>
        <VirtualGrid
          rows={rows}
          columns={cols}
          totalWidth={totalWidth}
          rowHeight={ROW_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          renderCell={renderCell}
          renderHeaderCell={renderHeaderCell}
          renderFilterCell={renderFilterCell}
          onVirtualRangeChange={setVirtualRange}
        />
      </div>
    </div>
  );
}
