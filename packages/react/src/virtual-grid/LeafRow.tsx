import type { Column, ColumnPinMeta, LeafRow as LeafRowType } from "@qigrid/core";
import type { ReactNode } from "react";
import { memo } from "react";
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
  pinMeta?: ColumnPinMeta[] | undefined;
}

function LeafRowInner<TData>({
  row,
  columns,
  totalWidth,
  rowHeight,
  offsetY,
  interaction,
  renderCell,
  pinMeta,
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
          pinMeta={pinMeta?.[colIndex]}
        >
          {col.groupFor ? null : renderCell(row, col)}
        </GridCell>
      ))}
    </RowContainer>
  );
}

export const LeafRow = memo(LeafRowInner) as typeof LeafRowInner;
