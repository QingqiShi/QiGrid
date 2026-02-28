import type { Column } from "@qigrid/core";
import type { ReactNode } from "react";
import type { CellInteraction } from "./types";

interface GridCellProps<TData> {
  column: Column<TData>;
  colIndex: number;
  rowIndex: number;
  interaction: CellInteraction;
  children: ReactNode;
}

export function GridCell<TData>({
  column,
  colIndex,
  rowIndex,
  interaction,
  children,
}: GridCellProps<TData>): ReactNode {
  const { isDraggingRef, onCellMouseDown, onCellMouseEnter } = interaction;

  return (
    <div
      className="vgrid-cell"
      style={{ width: column.width, flexShrink: 0 }}
      onPointerDown={(e) => {
        if (!onCellMouseDown) return;
        isDraggingRef.current = true;
        onCellMouseDown(
          { rowIndex, columnIndex: colIndex },
          { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey },
        );
      }}
      onPointerEnter={() => {
        if (!onCellMouseEnter || !isDraggingRef.current) return;
        onCellMouseEnter({ rowIndex, columnIndex: colIndex });
      }}
    >
      {children}
    </div>
  );
}
