import { isCellInRanges, serializeRangeToTSV } from "@qigrid/core";
import type {
  CellCoord,
  Column,
  ColumnDef,
  GroupDisplayType,
  GroupRow,
  LeafRow,
  SortingState,
  VirtualRange,
} from "@qigrid/react";
import { useGrid, VirtualGrid } from "@qigrid/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { type Employee, generateEmployees } from "./data";
import "./grid.css";

const data = generateEmployees(10_000);

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 600;

const columns: ColumnDef<Employee>[] = [
  { id: "id", accessorKey: "id", header: "ID", aggFunc: "count" },
  { id: "firstName", accessorKey: "firstName", header: "First Name" },
  { id: "lastName", accessorKey: "lastName", header: "Last Name" },
  { id: "email", accessorKey: "email", header: "Email" },
  { id: "department", accessorKey: "department", header: "Department" },
  { id: "jobTitle", accessorKey: "jobTitle", header: "Job Title" },
  {
    id: "salary",
    accessorKey: "salary",
    header: "Salary",
    aggFunc: "sum",
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

const GROUP_BY_OPTIONS = [
  { label: "None", value: "" },
  { label: "Department", value: "department" },
  { label: "Location", value: "location" },
  { label: "Dept + Location", value: "department,location" },
];

const DISPLAY_TYPE_OPTIONS: { label: string; value: GroupDisplayType }[] = [
  { label: "Group Rows", value: "groupRows" },
  { label: "Single Column", value: "singleColumn" },
  { label: "Multiple Columns", value: "multipleColumns" },
];

export function App() {
  const [groupDisplayType, setGroupDisplayType] = useState<GroupDisplayType>("groupRows");
  const options = useMemo(() => ({ data, columns, groupDisplayType }), [groupDisplayType]);
  const grid = useGrid(options);
  const {
    rows,
    columns: cols,
    totalWidth,
    sorting,
    data: gridData,
    toggleSort,
    setColumnFilter,
    setColumnWidth,
    setGrouping,
    toggleGroupExpansion,
    focusedCell,
    selectionAnchor,
    selectedRanges,
    selectCell,
    extendSelection,
    addRange,
    selectAll,
    clearSelection,
    moveFocus,
    startDeselection,
    extendDeselection,
    endDeselection,
  } = grid;
  const totalRows = gridData.length;

  const [virtualRange, setVirtualRange] = useState<VirtualRange | null>(null);

  const dragModeRef = useRef<"add" | "deselect" | null>(null);
  const selectedRangesRef = useRef(selectedRanges);
  selectedRangesRef.current = selectedRanges;

  // --- Group-by handler ---
  const handleGroupByChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setGrouping(value ? value.split(",") : []);
    },
    [setGrouping],
  );

  const handleDisplayTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setGroupDisplayType(e.target.value as GroupDisplayType);
  }, []);

  // --- Selection event handlers ---
  const handleCellMouseDown = useCallback(
    (coord: CellCoord, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
      const isMultiSelect = event.ctrlKey || event.metaKey;
      if (event.shiftKey) {
        extendSelection(coord);
      } else if (isMultiSelect) {
        if (isCellInRanges(coord, selectedRangesRef.current)) {
          startDeselection(coord);
          dragModeRef.current = "deselect";
        } else {
          addRange({ start: coord, end: coord });
          dragModeRef.current = "add";
        }
      } else {
        selectCell(coord);
        dragModeRef.current = null;
      }
    },
    [selectCell, extendSelection, addRange, startDeselection],
  );

  const handleCellMouseEnter = useCallback(
    (coord: CellCoord) => {
      if (dragModeRef.current === "deselect") {
        extendDeselection(coord);
      } else {
        extendSelection(coord);
      }
    },
    [extendSelection, extendDeselection],
  );

  const handleSelectionMouseUp = useCallback(() => {
    endDeselection();
    dragModeRef.current = null;
  }, [endDeselection]);

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const isMultiSelect = event.ctrlKey || event.metaKey;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          moveFocus(-1, 0, event.shiftKey);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocus(1, 0, event.shiftKey);
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveFocus(0, -1, event.shiftKey);
          break;
        case "ArrowRight":
          event.preventDefault();
          moveFocus(0, 1, event.shiftKey);
          break;
        case "Tab":
          event.preventDefault();
          if (event.shiftKey) {
            moveFocus(0, -1);
          } else {
            moveFocus(0, 1);
          }
          break;
        case "a":
          if (isMultiSelect) {
            event.preventDefault();
            selectAll();
          }
          break;
        case "Escape":
          event.preventDefault();
          clearSelection();
          break;
        case "Home":
          event.preventDefault();
          moveFocus(0, -cols.length, event.shiftKey);
          break;
        case "End":
          event.preventDefault();
          moveFocus(0, cols.length, event.shiftKey);
          break;
        case "PageUp":
          event.preventDefault();
          moveFocus(-Math.max(1, Math.floor(CONTAINER_HEIGHT / ROW_HEIGHT)), 0, event.shiftKey);
          break;
        case "PageDown":
          event.preventDefault();
          moveFocus(Math.max(1, Math.floor(CONTAINER_HEIGHT / ROW_HEIGHT)), 0, event.shiftKey);
          break;
        case "c":
          if (isMultiSelect && selectedRanges.length > 0) {
            event.preventDefault();
            const columnIds = cols.map((c) => c.id);
            // serializeRangeToTSV skips rows without getValue (group rows)
            const parts = selectedRanges.map((range) =>
              serializeRangeToTSV(
                rows as { getValue?: (id: string) => unknown }[],
                columnIds,
                range,
              ),
            );
            navigator.clipboard.writeText(parts.join("\n")).catch(() => {
              // Clipboard write failed (insecure context, etc.) — silently ignore
            });
          }
          break;
      }
    },
    [moveFocus, selectAll, clearSelection, selectedRanges, cols, rows],
  );

  const renderCell = useCallback((row: LeafRow<Employee>, column: Column<Employee>) => {
    return <CellValue col={column} value={row.getValue(column.id)} />;
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

  const renderGroupRow = useCallback((row: GroupRow, toggleExpansion: () => void) => {
    const salaryTotal = row.aggregatedValues.salary as number | undefined;
    return (
      <button
        type="button"
        className="group-header"
        style={{ paddingLeft: `${16 + row.depth * 20}px` }}
        onClick={toggleExpansion}
        data-group-id={row.groupId}
      >
        <span className="group-toggle">{row.isExpanded ? "\u25BE" : "\u25B8"}</span>
        <span className="group-value">{String(row.groupValue)}</span>
        <span className="group-count">({row.leafCount})</span>
        {salaryTotal !== undefined && (
          <span className="group-salary"> Total: {formatSalary(salaryTotal)}</span>
        )}
      </button>
    );
  }, []);

  const renderGroupCell = useCallback((row: GroupRow, column: Column<Employee>) => {
    // For group columns, return undefined to use default toggle
    if (column.groupFor) return undefined;
    // For data columns, show aggregated value using CellValue formatter
    const aggValue = row.aggregatedValues[column.id];
    if (aggValue !== undefined) return <CellValue col={column} value={aggValue} />;
    return null;
  }, []);

  const visibleStart = virtualRange ? virtualRange.startIndex + 1 : 0;
  const visibleEnd = virtualRange ? virtualRange.endIndex : 0;

  return (
    <div className="playground">
      <h1>QiGrid Playground</h1>
      <p className="subtitle">
        Showing {rows.length} of {totalRows} rows via <code>@qigrid/react</code> &rarr;{" "}
        <code>@qigrid/core</code>
      </p>

      <div className="grid-controls">
        <label htmlFor="group-by-select">
          Group by:{" "}
          <select id="group-by-select" onChange={handleGroupByChange} defaultValue="">
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="display-type-select">
          Display:{" "}
          <select
            id="display-type-select"
            value={groupDisplayType}
            onChange={handleDisplayTypeChange}
          >
            {DISPLAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
          groupDisplayType={groupDisplayType}
          renderCell={renderCell}
          renderHeaderCell={renderHeaderCell}
          renderFilterCell={renderFilterCell}
          renderGroupRow={renderGroupRow}
          renderGroupCell={renderGroupCell}
          onToggleGroupExpansion={toggleGroupExpansion}
          onVirtualRangeChange={setVirtualRange}
          onColumnResize={setColumnWidth}
          focusedCell={focusedCell}
          selectionAnchor={selectionAnchor}
          selectedRanges={selectedRanges}
          onCellMouseDown={handleCellMouseDown}
          onCellMouseEnter={handleCellMouseEnter}
          onSelectionMouseUp={handleSelectionMouseUp}
          onGridKeyDown={handleGridKeyDown}
          onCellAction={() => {}}
        />
      </div>
    </div>
  );
}
