import type { Column, ColumnPinMeta, GroupRow } from "@qigrid/core";
import type { ReactNode } from "react";
import { memo } from "react";
import { GridCell } from "./GridCell";
import { RowContainer } from "./RowContainer";
import type { CellInteraction } from "./types";

interface CellGroupRowProps<TData> {
  row: GroupRow;
  columns: Column<TData>[];
  totalWidth: number;
  rowHeight: number;
  offsetY: number;
  interaction: CellInteraction;
  renderGroupCell?: ((row: GroupRow, column: Column<TData>) => ReactNode) | undefined;
  onToggleGroupExpansion?: ((groupId: string) => void) | undefined;
  pinMeta?: ColumnPinMeta[] | undefined;
}

function getGroupCellContent<TData>(
  row: GroupRow,
  col: Column<TData>,
  renderGroupCell: ((row: GroupRow, column: Column<TData>) => ReactNode) | undefined,
  onToggleGroupExpansion: ((groupId: string) => void) | undefined,
): ReactNode {
  if (col.groupFor) {
    const isActive = col.groupFor === "*" || col.groupFor === row.columnId;
    if (!isActive) return null;

    if (renderGroupCell) {
      const custom = renderGroupCell(row, col);
      if (custom !== undefined) return custom;
    }

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

  // Data column: show aggregated value if available
  if (renderGroupCell) {
    const custom = renderGroupCell(row, col);
    if (custom !== undefined) return custom;
  }

  const aggValue = row.aggregatedValues[col.id];
  if (aggValue !== undefined) return String(aggValue);

  return null;
}

function CellGroupRowInner<TData>({
  row,
  columns,
  totalWidth,
  rowHeight,
  offsetY,
  interaction,
  renderGroupCell,
  onToggleGroupExpansion,
  pinMeta,
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
          interaction={interaction}
          pinMeta={pinMeta?.[colIndex]}
        >
          {getGroupCellContent(row, col, renderGroupCell, onToggleGroupExpansion)}
        </GridCell>
      ))}
    </RowContainer>
  );
}

export const CellGroupRow = memo(CellGroupRowInner) as typeof CellGroupRowInner;
