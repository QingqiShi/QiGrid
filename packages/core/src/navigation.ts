import type { CellCoord } from "./selection";
import { clampCell } from "./selection";

export type NavigationDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "pageUp"
  | "pageDown";

/**
 * Compute the next focus position given a direction and grid bounds.
 * Results are clamped to valid coordinates.
 */
export function computeNextFocus(
  current: CellCoord,
  direction: NavigationDirection,
  rowCount: number,
  colCount: number,
  pageSize?: number,
): CellCoord {
  let { rowIndex, columnIndex } = current;

  switch (direction) {
    case "up":
      rowIndex -= 1;
      break;
    case "down":
      rowIndex += 1;
      break;
    case "left":
      columnIndex -= 1;
      break;
    case "right":
      columnIndex += 1;
      break;
    case "home":
      columnIndex = 0;
      break;
    case "end":
      columnIndex = colCount - 1;
      break;
    case "pageUp":
      rowIndex -= pageSize ?? 1;
      break;
    case "pageDown":
      rowIndex += pageSize ?? 1;
      break;
  }

  return clampCell({ rowIndex, columnIndex }, rowCount, colCount);
}
