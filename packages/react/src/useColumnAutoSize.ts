import type { Column } from "@qigrid/core";
import { computeAutoSizedWidths } from "@qigrid/core";
import { useCallback, useRef } from "react";

export interface UseColumnAutoSizeOptions<TData> {
  columns: Column<TData>[];
  data: TData[];
  sampleSize?: number;
  cellPadding?: number;
}

export interface UseColumnAutoSizeReturn {
  autoSizeColumns: () => Record<string, number>;
}

const DEFAULT_SAMPLE_SIZE = 100;
const DEFAULT_CELL_PADDING = 32;

export function useColumnAutoSize<TData>(
  options: UseColumnAutoSizeOptions<TData>,
): UseColumnAutoSizeReturn {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const autoSizeColumns = useCallback((): Record<string, number> => {
    const {
      columns,
      data,
      sampleSize = DEFAULT_SAMPLE_SIZE,
      cellPadding = DEFAULT_CELL_PADDING,
    } = optionsRef.current;

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.visibility = "hidden";
    container.style.whiteSpace = "nowrap";
    document.body.appendChild(container);

    const headerEl = document.createElement("span");
    headerEl.style.fontWeight = "600";
    headerEl.style.fontSize = "12px";
    headerEl.style.textTransform = "uppercase";
    headerEl.style.letterSpacing = "0.05em";
    container.appendChild(headerEl);

    const cellEl = document.createElement("span");
    cellEl.style.fontSize = "14px";
    container.appendChild(cellEl);

    const stride = Math.max(1, Math.ceil(data.length / sampleSize));

    const measuredWidths: Record<string, number> = {};

    for (const col of columns) {
      if (!col.enableAutoSize) continue;

      // Measure header
      headerEl.textContent = col.header;
      let maxWidth = headerEl.offsetWidth;

      // Measure sampled cell values
      for (let i = 0; i < data.length; i += stride) {
        const row = data[i] as TData;
        cellEl.textContent = String(col.getValue(row));
        const w = cellEl.offsetWidth;
        if (w > maxWidth) maxWidth = w;
      }

      measuredWidths[col.id] = maxWidth + cellPadding;
    }

    document.body.removeChild(container);

    return computeAutoSizedWidths(columns, measuredWidths);
  }, []);

  return { autoSizeColumns };
}
