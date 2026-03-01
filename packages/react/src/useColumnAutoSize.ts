import type { Column } from "@qigrid/core";
import { computeAutoSizedWidths } from "@qigrid/core";
import type { RefObject } from "react";
import { useCallback, useRef } from "react";

export interface UseColumnAutoSizeOptions<TData> {
  columns: Column<TData>[];
  data: TData[];
  gridRef: RefObject<HTMLElement | null>;
}

export interface UseColumnAutoSizeReturn {
  autoSizeColumns: () => Record<string, number>;
}

export function useColumnAutoSize<TData>(
  options: UseColumnAutoSizeOptions<TData>,
): UseColumnAutoSizeReturn {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const autoSizeColumns = useCallback((): Record<string, number> => {
    const { columns, gridRef } = optionsRef.current;

    const gridEl = gridRef.current;
    if (!gridEl) return {};

    // Create an off-screen container that inherits the grid's font styles
    const measureContainer = document.createElement("div");
    measureContainer.style.position = "absolute";
    measureContainer.style.left = "-9999px";
    measureContainer.style.top = "-9999px";
    measureContainer.style.visibility = "hidden";
    measureContainer.style.whiteSpace = "nowrap";
    // Copy computed font from the grid element so measurements use the same font
    const gridStyles = getComputedStyle(gridEl);
    measureContainer.style.fontFamily = gridStyles.fontFamily;
    gridEl.appendChild(measureContainer);

    const measuredWidths: Record<string, number> = {};

    // Measure header cells
    const headerCells = gridEl.querySelectorAll<HTMLElement>(".vgrid-header-cell");
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col = columns[colIdx] as Column<TData>;
      if (!col.enableAutoSize) continue;

      const headerCell = headerCells[colIdx];
      let maxWidth = 0;

      if (headerCell) {
        // Clone header content into auto-width container to measure natural width
        const clone = headerCell.cloneNode(true) as HTMLElement;
        clone.style.width = "auto";
        clone.style.position = "static";
        clone.style.overflow = "visible";
        // Remove resize handle from clone — it doesn't contribute to content width
        const handle = clone.querySelector(".vgrid-resize-handle");
        handle?.remove();
        measureContainer.appendChild(clone);
        maxWidth = clone.offsetWidth;
        measureContainer.removeChild(clone);
      }

      // Measure visible data cells for this column
      const dataCells = gridEl.querySelectorAll<HTMLElement>(
        `.vgrid-row .vgrid-cell:nth-child(${colIdx + 1})`,
      );
      for (const cell of dataCells) {
        const clone = cell.cloneNode(true) as HTMLElement;
        clone.style.width = "auto";
        clone.style.overflow = "visible";
        measureContainer.appendChild(clone);
        const w = clone.offsetWidth;
        if (w > maxWidth) maxWidth = w;
        measureContainer.removeChild(clone);
      }

      if (maxWidth > 0) {
        measuredWidths[col.id] = maxWidth;
      }
    }

    gridEl.removeChild(measureContainer);

    return computeAutoSizedWidths(columns, measuredWidths);
  }, []);

  return { autoSizeColumns };
}
