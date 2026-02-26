import type { GroupRow } from "@qigrid/core";
import type { CSSProperties, ReactNode } from "react";
import { RowContainer } from "./RowContainer";
import { computeGroupRowSelectionBorders, isRowInRanges } from "./selectionStyles";
import type { SelectionState } from "./types";

interface BannerGroupRowProps {
  row: GroupRow;
  totalWidth: number;
  rowHeight: number;
  offsetY: number;
  selection: SelectionState;
  renderGroupRow?: ((row: GroupRow, toggleExpansion: () => void) => ReactNode) | undefined;
  onToggleGroupExpansion?: ((groupId: string) => void) | undefined;
}

export function BannerGroupRow({
  row,
  totalWidth,
  rowHeight,
  offsetY,
  selection,
  renderGroupRow,
  onToggleGroupExpansion,
}: BannerGroupRowProps): ReactNode {
  const isFocused = selection.focusedCell != null && selection.focusedCell.rowIndex === row.index;
  const isSelected = selection.hasSelection && isRowInRanges(row.index, selection.ranges);

  const className = `vgrid-row vgrid-group-row vgrid-group-row--banner${isFocused ? " vgrid-group-row--focused" : ""}${isSelected ? " vgrid-group-row--selected" : ""}`;

  const selectionStyle: CSSProperties | undefined = isSelected
    ? computeGroupRowSelectionBorders(row.index, selection.ranges)
    : undefined;

  return (
    <RowContainer
      className={className}
      rowIndex={row.index}
      groupId={row.groupId}
      width={totalWidth}
      height={rowHeight}
      offsetY={offsetY}
      style={selectionStyle}
    >
      <div className="vgrid-group-cell" style={{ width: totalWidth, flexShrink: 0 }}>
        {renderGroupRow
          ? renderGroupRow(row, () => onToggleGroupExpansion?.(row.groupId))
          : `${row.groupValue} (${row.leafCount})`}
      </div>
    </RowContainer>
  );
}
