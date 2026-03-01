import type { Column, ColumnDef, GroupRow, LeafRow } from "@qigrid/react";
import { useColumnAutoSize, useGrid, VirtualGrid } from "@qigrid/react";
import { useCallback, useMemo, useRef } from "react";
import { type Employee, generateEmployees } from "../src/data";

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 600;

const columns: ColumnDef<Employee>[] = [
  { id: "id", accessorKey: "id", header: "ID", aggFunc: "count" },
  { id: "firstName", accessorKey: "firstName", header: "First Name" },
  { id: "lastName", accessorKey: "lastName", header: "Last Name" },
  { id: "email", accessorKey: "email", header: "Email" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "jobTitle", accessorKey: "jobTitle", header: "Job Title" },
  { id: "salary", accessorKey: "salary", header: "Salary", aggFunc: "sum" },
  { id: "startDate", accessorKey: "startDate", header: "Start Date" },
  { id: "location", accessorKey: "location", header: "Location" },
];

const params = new URLSearchParams(window.location.search);
const initialRowCount = Number(params.get("rows")) || 10_000;
const initialGrouping = params.get("group")?.split(",").filter(Boolean) ?? [];

export function App() {
  const data = useMemo(() => generateEmployees(initialRowCount), []);
  const options = useMemo(() => ({ data, columns, grouping: initialGrouping }), [data]);
  const grid = useGrid(options);

  const {
    rows,
    columns: cols,
    totalWidth,
    toggleSort,
    setGrouping,
    toggleGroupExpansion,
    setColumnFilter,
    setColumnWidth,
    selectCell,
    extendSelection,
    selectedRanges,
  } = grid;

  const gridRef = useRef<HTMLDivElement>(null);
  const { autoSizeColumns: autoSizeColumnsFn } = useColumnAutoSize({
    columns: cols,
    data,
    gridRef,
  });

  // Expose grid API on window for Playwright benchmarks.
  // Assigned during render (not in useEffect) so it's available immediately
  // when the grid DOM element is visible — no async timing gap.
  const autoSizeColumns = useCallback(() => {
    const widths = autoSizeColumnsFn();
    for (const id of Object.keys(widths)) {
      setColumnWidth(id, widths[id] as number);
    }
  }, [autoSizeColumnsFn, setColumnWidth]);

  // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
  (window as any).__grid = {
    toggleSort,
    setGrouping,
    toggleGroupExpansion,
    setColumnFilter,
    autoSizeColumns,
    selectCell,
    extendSelection,
    get rows() {
      return rows;
    },
    get columns() {
      return cols;
    },
    get selectedRanges() {
      return selectedRanges;
    },
  };

  const renderCell = useCallback(
    (row: LeafRow<Employee>, column: Column<Employee>) => <>{String(row.getValue(column.id))}</>,
    [],
  );

  const renderHeaderCell = useCallback(
    (column: Column<Employee>) => <span>{column.header}</span>,
    [],
  );

  const renderFilterCell = useCallback(
    (column: Column<Employee>) => (
      <input
        type="text"
        placeholder={`Filter ${column.header}...`}
        aria-label={`Filter ${column.header}`}
        onChange={(e) => setColumnFilter(column.id, e.target.value)}
      />
    ),
    [setColumnFilter],
  );

  const renderGroupRow = useCallback(
    (row: GroupRow, toggleExpansion: () => void) => (
      <button
        type="button"
        style={{ paddingLeft: `${16 + row.depth * 20}px` }}
        onClick={toggleExpansion}
        data-group-id={row.groupId}
      >
        {row.isExpanded ? "\u25BE" : "\u25B8"} {String(row.groupValue)} ({row.leafCount})
      </button>
    ),
    [],
  );

  return (
    <VirtualGrid
      ref={gridRef}
      rows={rows}
      columns={cols}
      totalWidth={totalWidth}
      rowHeight={ROW_HEIGHT}
      containerHeight={CONTAINER_HEIGHT}
      bufferSize={10}
      renderCell={renderCell}
      renderHeaderCell={renderHeaderCell}
      renderFilterCell={renderFilterCell}
      renderGroupRow={renderGroupRow}
      onToggleGroupExpansion={toggleGroupExpansion}
      selectedRanges={selectedRanges}
    />
  );
}
