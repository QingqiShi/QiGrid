import type { Column } from "@qigrid/core";
import type { ReactNode } from "react";

interface GridHeaderProps<TData> {
  columns: Column<TData>[];
  totalWidth: number;
  renderHeaderCell: (column: Column<TData>) => ReactNode;
  renderFilterCell?: ((column: Column<TData>) => ReactNode) | undefined;
  onColumnResize?: ((columnId: string, width: number) => void) | undefined;
  onResizePointerDown: (
    columnId: string,
    startWidth: number,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
}

export function GridHeader<TData>({
  columns,
  totalWidth,
  renderHeaderCell,
  renderFilterCell,
  onColumnResize,
  onResizePointerDown,
}: GridHeaderProps<TData>): ReactNode {
  return (
    <div
      className="vgrid-header"
      style={{ position: "sticky", top: 0, zIndex: 2, width: totalWidth }}
    >
      <div className="vgrid-header-row" style={{ display: "flex" }}>
        {columns.map((col) => (
          <div
            key={col.id}
            className="vgrid-header-cell"
            style={{
              width: col.width,
              flexShrink: 0,
              ...(onColumnResize ? { position: "relative" as const } : undefined),
            }}
          >
            {renderHeaderCell(col)}
            {onColumnResize && (
              <div
                className="vgrid-resize-handle"
                data-testid={`resize-handle-${col.id}`}
                onPointerDown={(e) => onResizePointerDown(col.id, col.width, e)}
              />
            )}
          </div>
        ))}
      </div>
      {renderFilterCell && (
        <div className="vgrid-filter-row" style={{ display: "flex" }}>
          {columns.map((col) => (
            <div
              key={`filter-${col.id}`}
              className="vgrid-filter-cell"
              style={{ width: col.width, flexShrink: 0 }}
            >
              {col.groupFor ? null : renderFilterCell(col)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
