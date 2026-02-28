import type { Column, LeafRow as LeafRowType } from "@qigrid/core";
import type { ReactNode } from "react";
import { GridCell } from "./GridCell";
import { RowContainer } from "./RowContainer";
import type { CellInteraction } from "./types";

interface LeafRowProps<TData> {
  row: LeafRowType<TData>;
  columns: Column<TData>[];
  totalWidth: number;
  rowHeight: number;
  offsetY: number;
  interaction: CellInteraction;
  renderCell: (row: LeafRowType<TData>, column: Column<TData>) => ReactNode;
}

export function LeafRow<TData>({
  row,
  columns,
  totalWidth,
  rowHeight,
  offsetY,
  interaction,
  renderCell,
}: LeafRowProps<TData>): ReactNode {
  return (
    <RowContainer
      className={`vgrid-row${row.index % 2 === 0 ? " vgrid-row-even" : ""}`}
      rowIndex={row.index}
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
        >
          {col.groupFor ? null : renderCell(row, col)}
        </GridCell>
      ))}
    </RowContainer>
  );
}
