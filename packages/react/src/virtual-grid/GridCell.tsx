import type { Column } from "@qigrid/core";
import type { ReactNode } from "react";
import type { CellInteraction, SelectionState } from "./types";

interface GridCellProps<TData> {
  column: Column<TData>;
  colIndex: number;
  rowIndex: number;
  selection: SelectionState;
  interaction: CellInteraction;
  children: ReactNode;
}

export function GridCell<TData>({
  column,
  colIndex,
  rowIndex,
  selection,
  interaction,
  children,
}: GridCellProps<TData>): ReactNode {
  const { focusedCell } = selection;
  const { isDraggingRef, onCellMouseDown, onCellMouseEnter } = interaction;

  const isFocused =
    focusedCell != null &&
    focusedCell.rowIndex === rowIndex &&
    focusedCell.columnIndex === colIndex;

  // The class is a marker for tests and accessibility — visual rendering
  // is handled entirely by SelectionOverlay.
  const className = `vgrid-cell${isFocused ? " vgrid-cell--focused" : ""}`;

  return (
    <div
      className={className}
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
