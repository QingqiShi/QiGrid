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
  const { focusedCell, selectionAnchor, hasSelection } = selection;
  const { isDraggingRef, onCellMouseDown, onCellMouseEnter } = interaction;

  const isFocused =
    focusedCell != null &&
    focusedCell.rowIndex === rowIndex &&
    focusedCell.columnIndex === colIndex;

  // Hide the focused border when it differs from the anchor (i.e. the user
  // has extended the selection). The anchor indicator is enough and the focus
  // outline on the range end cell is visually confusing.
  const anchorMatchesFocus =
    focusedCell != null &&
    selectionAnchor != null &&
    focusedCell.rowIndex === selectionAnchor.rowIndex &&
    focusedCell.columnIndex === selectionAnchor.columnIndex;
  const showFocused = isFocused && (!hasSelection || anchorMatchesFocus);

  const className = `vgrid-cell${showFocused ? " vgrid-cell--focused" : ""}`;

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
