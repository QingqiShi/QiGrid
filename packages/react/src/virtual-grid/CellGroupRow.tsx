import type { Column, GroupRow } from "@qigrid/core";
import type { ReactNode } from "react";
import { GridCell } from "./GridCell";
import { RowContainer } from "./RowContainer";
import type { CellInteraction, SelectionState } from "./types";

interface CellGroupRowProps<TData> {
  row: GroupRow;
  columns: Column<TData>[];
  totalWidth: number;
  rowHeight: number;
  offsetY: number;
  selection: SelectionState;
  interaction: CellInteraction;
  renderGroupCell?: ((row: GroupRow, column: Column<TData>) => ReactNode) | undefined;
  onToggleGroupExpansion?: ((groupId: string) => void) | undefined;
}

function getGroupCellContent<TData>(
  row: GroupRow,
  col: Column<TData>,
  renderGroupCell: ((row: GroupRow, column: Column<TData>) => ReactNode) | undefined,
  onToggleGroupExpansion: ((groupId: string) => void) | undefined,
): ReactNode {
  if (!col.groupFor) return null;

  const isActive = col.groupFor === "*" || col.groupFor === row.columnId;
  if (!isActive) return null;

  if (renderGroupCell) return renderGroupCell(row, col);

  return (
    <button
      type="button"
      className="vgrid-group-toggle"
      style={{
        paddingLeft: col.groupFor === "*" ? `${row.depth * 20}px` : undefined,
      }}
      onClick={() => onToggleGroupExpansion?.(row.groupId)}
    >
      <span className="group-toggle">{row.isExpanded ? "\u25BE" : "\u25B8"}</span>{" "}
      {String(row.groupValue)} ({row.leafCount})
    </button>
  );
}

export function CellGroupRow<TData>({
  row,
  columns,
  totalWidth,
  rowHeight,
  offsetY,
  selection,
  interaction,
  renderGroupCell,
  onToggleGroupExpansion,
}: CellGroupRowProps<TData>): ReactNode {
  return (
    <RowContainer
      className={`vgrid-row vgrid-group-row${row.index % 2 === 0 ? " vgrid-row-even" : ""}`}
      rowIndex={row.index}
      groupId={row.groupId}
      width={totalWidth}
      height={rowHeight}
      offsetY={offsetY}
    >
      {columns.map((col, colIndex) => (
        <GridCell
          key={col.id}
          column={col}
          colIndex={colIndex}
          rowIndex={row.index}
          selection={selection}
          interaction={interaction}
        >
          {getGroupCellContent(row, col, renderGroupCell, onToggleGroupExpansion)}
        </GridCell>
      ))}
    </RowContainer>
  );
}
