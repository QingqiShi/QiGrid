import type { Column, ColumnPinMeta } from "@qigrid/core";
import { memo, type ReactNode } from "react";

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
  pinMeta?: ColumnPinMeta[] | undefined;
}

function buildPinStyle(meta: ColumnPinMeta | undefined): React.CSSProperties | undefined {
  if (!meta?.pin) return undefined;
  if (meta.pin === "left") {
    return { position: "sticky", left: meta.stickyOffset, zIndex: 3 };
  }
  return { position: "sticky", right: meta.stickyOffset, zIndex: 3 };
}

function buildPinClasses(meta: ColumnPinMeta | undefined, base: string): string {
  if (!meta?.pin) return base;
  let cls = base;
  if (meta.pin === "left") {
    cls += " vgrid-cell-pinned-left";
    if (meta.isLastPinLeft) cls += " vgrid-cell-pinned-last-left";
  } else {
    cls += " vgrid-cell-pinned-right";
    if (meta.isFirstPinRight) cls += " vgrid-cell-pinned-first-right";
  }
  return cls;
}

function GridHeaderInner<TData>({
  columns,
  totalWidth,
  renderHeaderCell,
  renderFilterCell,
  onColumnResize,
  onResizePointerDown,
  pinMeta,
}: GridHeaderProps<TData>): ReactNode {
  return (
    <div
      className="vgrid-header"
      style={{ position: "sticky", top: 0, zIndex: 2, width: totalWidth }}
    >
      <div className="vgrid-header-row" style={{ display: "flex" }}>
        {columns.map((col, i) => {
          const meta = pinMeta?.[i];
          const pinStyle = buildPinStyle(meta);
          return (
            <div
              key={col.id}
              className={buildPinClasses(meta, "vgrid-header-cell")}
              style={{
                width: col.width,
                flexShrink: 0,
                ...(onColumnResize ? { position: "relative" as const } : undefined),
                ...pinStyle,
                ...(onColumnResize && pinStyle ? { position: "sticky" as const } : undefined),
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
          );
        })}
      </div>
      {renderFilterCell && (
        <div className="vgrid-filter-row" style={{ display: "flex" }}>
          {columns.map((col, i) => {
            const meta = pinMeta?.[i];
            return (
              <div
                key={`filter-${col.id}`}
                className={buildPinClasses(meta, "vgrid-filter-cell")}
                style={{ width: col.width, flexShrink: 0, ...buildPinStyle(meta) }}
              >
                {col.groupFor ? null : renderFilterCell(col)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const GridHeader = memo(GridHeaderInner) as typeof GridHeaderInner;
