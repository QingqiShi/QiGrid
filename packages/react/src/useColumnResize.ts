import { useCallback } from "react";

/**
 * Returns a pointerdown handler that initiates a column resize drag.
 * Uses pointer capture for reliable tracking even when the cursor
 * leaves the handle during fast drags.
 */
export function useColumnResize(
  onColumnResize: ((columnId: string, width: number) => void) | undefined,
): (columnId: string, startWidth: number, e: React.PointerEvent<HTMLDivElement>) => void {
  return useCallback(
    (columnId: string, startWidth: number, e: React.PointerEvent<HTMLDivElement>) => {
      if (!onColumnResize) return;
      e.stopPropagation();
      e.preventDefault();

      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      const startX = e.clientX;

      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        onColumnResize(columnId, startWidth + delta);
      };

      const cleanup = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", cleanup);
        handle.removeEventListener("lostpointercapture", cleanup);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", cleanup);
      handle.addEventListener("lostpointercapture", cleanup);
    },
    [onColumnResize],
  );
}
