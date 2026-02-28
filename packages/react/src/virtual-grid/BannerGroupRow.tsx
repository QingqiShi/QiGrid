import type { GroupRow } from "@qigrid/core";
import type { ReactNode } from "react";
import { RowContainer } from "./RowContainer";

interface BannerGroupRowProps {
  row: GroupRow;
  totalWidth: number;
  rowHeight: number;
  offsetY: number;
  renderGroupRow?: ((row: GroupRow, toggleExpansion: () => void) => ReactNode) | undefined;
  onToggleGroupExpansion?: ((groupId: string) => void) | undefined;
}

export function BannerGroupRow({
  row,
  totalWidth,
  rowHeight,
  offsetY,
  renderGroupRow,
  onToggleGroupExpansion,
}: BannerGroupRowProps): ReactNode {
  return (
    <RowContainer
      className="vgrid-row vgrid-group-row vgrid-group-row--banner"
      rowIndex={row.index}
      groupId={row.groupId}
      width={totalWidth}
      height={rowHeight}
      offsetY={offsetY}
    >
      <div className="vgrid-group-cell" style={{ width: totalWidth, flexShrink: 0 }}>
        {renderGroupRow
          ? renderGroupRow(row, () => onToggleGroupExpansion?.(row.groupId))
          : `${row.groupValue} (${row.leafCount})`}
      </div>
    </RowContainer>
  );
}
