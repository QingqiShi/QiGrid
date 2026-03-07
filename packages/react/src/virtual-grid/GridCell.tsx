import type { Column, ColumnPinMeta } from "@qigrid/core";
import type { ReactNode } from "react";
import type { CellInteraction } from "./types";

interface GridCellProps<TData> {
  column: Column<TData>;
  colIndex: number;
  rowIndex: number;
  interaction: CellInteraction;
  pinMeta?: ColumnPinMeta | undefined;
  children: ReactNode;
}

export function GridCell<TData>({
  column,
  colIndex,
  rowIndex,
  interaction,
  pinMeta,
  children,
}: GridCellProps<TData>): ReactNode {
  const { isDraggingRef, onCellMouseDown, onCellMouseEnter } = interaction;

  let className = "vgrid-cell";
  let stickyStyle: React.CSSProperties | undefined;

  if (pinMeta?.pin) {
    if (pinMeta.pin === "left") {
      className += " vgrid-cell-pinned-left";
      if (pinMeta.isLastPinLeft) className += " vgrid-cell-pinned-last-left";
      stickyStyle = { position: "sticky", left: pinMeta.stickyOffset, zIndex: 1 };
    } else {
      className += " vgrid-cell-pinned-right";
      if (pinMeta.isFirstPinRight) className += " vgrid-cell-pinned-first-right";
      stickyStyle = { position: "sticky", right: pinMeta.stickyOffset, zIndex: 1 };
    }
  }

  return (
    <div
      className={className}
      style={{ width: column.width, flexShrink: 0, ...stickyStyle }}
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
