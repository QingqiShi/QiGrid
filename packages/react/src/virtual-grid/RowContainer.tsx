import type { CSSProperties, ReactNode } from "react";

interface RowContainerProps {
  className: string;
  rowIndex: number;
  groupId?: string;
  width: number;
  height: number;
  offsetY: number;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export function RowContainer({
  className,
  rowIndex,
  groupId,
  width,
  height,
  offsetY,
  style,
  children,
}: RowContainerProps): ReactNode {
  return (
    <div
      className={className}
      data-row-index={rowIndex}
      data-group-id={groupId}
      style={{
        display: "flex",
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        transform: `translateY(${offsetY}px)`,
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
