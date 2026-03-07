import type { GridRow, GroupRow, LeafRow, PinnedPartition } from "./types";

// Stable empty array — preserves referential equality across calls
const EMPTY_LEAVES: LeafRow<never>[] = [];

/**
 * Partition post-pipeline rows into pinned-top, body, and pinned-bottom sections.
 *
 * Predicates are evaluated against each LeafRow's `original` data and `index`.
 * If a row matches both predicates, top wins.
 *
 * When grouping is active, pinned leaves are extracted from their groups.
 * GroupRows with no remaining body leaves are removed. GroupRows that keep
 * some leaves are cloned with an adjusted `leafCount`.
 */
export function partitionPinnedRows<TData>(
  rows: GridRow<TData>[],
  pinnedTopPredicate?: (row: TData, index: number) => boolean,
  pinnedBottomPredicate?: (row: TData, index: number) => boolean,
  hasGroups = false,
): PinnedPartition<TData> {
  // Fast path: no predicates → zero overhead, same references
  if (!pinnedTopPredicate && !pinnedBottomPredicate) {
    return {
      pinnedTop: EMPTY_LEAVES as LeafRow<TData>[],
      body: rows,
      pinnedBottom: EMPTY_LEAVES as LeafRow<TData>[],
    };
  }

  if (!hasGroups) {
    return partitionFlat(rows as LeafRow<TData>[], pinnedTopPredicate, pinnedBottomPredicate);
  }

  return partitionGrouped(rows, pinnedTopPredicate, pinnedBottomPredicate);
}

function classify<TData>(
  row: LeafRow<TData>,
  pinnedTopPredicate?: (row: TData, index: number) => boolean,
  pinnedBottomPredicate?: (row: TData, index: number) => boolean,
): "top" | "bottom" | "body" {
  if (pinnedTopPredicate?.(row.original, row.index)) return "top";
  if (pinnedBottomPredicate?.(row.original, row.index)) return "bottom";
  return "body";
}

function partitionFlat<TData>(
  rows: LeafRow<TData>[],
  pinnedTopPredicate?: (row: TData, index: number) => boolean,
  pinnedBottomPredicate?: (row: TData, index: number) => boolean,
): PinnedPartition<TData> {
  const pinnedTop: LeafRow<TData>[] = [];
  const body: LeafRow<TData>[] = [];
  const pinnedBottom: LeafRow<TData>[] = [];

  for (const row of rows) {
    const target = classify(row, pinnedTopPredicate, pinnedBottomPredicate);
    if (target === "top") pinnedTop.push(row);
    else if (target === "bottom") pinnedBottom.push(row);
    else body.push(row);
  }

  reindex(pinnedTop);
  reindex(body);
  reindex(pinnedBottom);

  return { pinnedTop, body, pinnedBottom };
}

function partitionGrouped<TData>(
  rows: GridRow<TData>[],
  pinnedTopPredicate?: (row: TData, index: number) => boolean,
  pinnedBottomPredicate?: (row: TData, index: number) => boolean,
): PinnedPartition<TData> {
  // Pass 1: Classify each leaf and count body leaves per group.
  // Groups are initialized when encountered in the stack walk (no separate init pass).
  const leafClassification = new Map<LeafRow<TData>, "top" | "bottom" | "body">();
  const groupBodyLeafCount = new Map<string, number>();

  const groupStack: GroupRow[] = [];
  for (const row of rows) {
    if (row.type === "group") {
      // Adjust stack to match current depth
      while (
        groupStack.length > 0 &&
        (groupStack[groupStack.length - 1] as GroupRow).depth >= row.depth
      ) {
        groupStack.pop();
      }
      groupStack.push(row);
      if (!groupBodyLeafCount.has(row.groupId)) {
        groupBodyLeafCount.set(row.groupId, 0);
      }
    } else {
      const cls = classify(row, pinnedTopPredicate, pinnedBottomPredicate);
      leafClassification.set(row, cls);

      if (cls === "body") {
        for (const g of groupStack) {
          groupBodyLeafCount.set(g.groupId, (groupBodyLeafCount.get(g.groupId) ?? 0) + 1);
        }
      }
    }
  }

  // Pass 2: Build the three partitions.
  const pinnedTop: LeafRow<TData>[] = [];
  const body: GridRow<TData>[] = [];
  const pinnedBottom: LeafRow<TData>[] = [];

  for (const row of rows) {
    if (row.type === "group") {
      const bodyCount = groupBodyLeafCount.get(row.groupId) ?? 0;
      if (bodyCount === 0) continue;
      if (bodyCount !== row.leafCount) {
        body.push({ ...row, leafCount: bodyCount });
      } else {
        body.push(row);
      }
    } else {
      const cls = leafClassification.get(row) ?? "body";
      if (cls === "top") pinnedTop.push(row);
      else if (cls === "bottom") pinnedBottom.push(row);
      else body.push(row);
    }
  }

  reindex(pinnedTop);
  reindex(body);
  reindex(pinnedBottom);

  return { pinnedTop, body, pinnedBottom };
}

function reindex<T extends { index: number }>(rows: T[]): void {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as T;
    if (row.index !== i) {
      rows[i] = { ...row, index: i };
    }
  }
}
