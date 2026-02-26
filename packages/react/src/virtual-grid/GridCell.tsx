import type { Column } from "@qigrid/core";
import { isCellInRanges } from "@qigrid/core";
import type { ReactNode } from "react";
import { computeCellSelectionBorders } from "./selectionStyles";
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
  const { focusedCell, selectionAnchor, ranges, hasSelection } = selection;
  const { isDraggingRef, onCellMouseDown, onCellMouseEnter } = interaction;

  const isFocused =
    focusedCell != null &&
    focusedCell.rowIndex === rowIndex &&
    focusedCell.columnIndex === colIndex;

  const isSelected = hasSelection && isCellInRanges({ rowIndex, columnIndex: colIndex }, ranges);

  const isAnchor =
    selectionAnchor != null &&
    selectionAnchor.rowIndex === rowIndex &&
    selectionAnchor.columnIndex === colIndex &&
    isSelected;

  const selStyle = isSelected ? computeCellSelectionBorders(rowIndex, colIndex, ranges) : undefined;

  const className = `vgrid-cell${isFocused ? " vgrid-cell--focused" : ""}${isSelected ? " vgrid-cell--selected" : ""}${isAnchor ? " vgrid-cell--anchor" : ""}`;

  return (
    <div
      className={className}
      style={{ width: column.width, flexShrink: 0, ...selStyle }}
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
