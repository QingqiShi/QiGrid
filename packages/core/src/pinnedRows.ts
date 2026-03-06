import type { GridRow, GroupRow, LeafRow, PinnedPartition } from "./types";

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
): PinnedPartition<TData> {
  // Fast path: no predicates → zero overhead, same reference
  if (!pinnedTopPredicate && !pinnedBottomPredicate) {
    return {
      pinnedTop: [],
      body: rows,
      pinnedBottom: [],
    };
  }

  const hasGroups = rows.some((r) => r.type === "group");

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

  // Re-index each partition
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
  // Pass 1: Classify each leaf row, track how many body leaves remain per group.
  // We use a map from groupId to the number of leaves that will stay in body.
  const leafClassification = new Map<LeafRow<TData>, "top" | "bottom" | "body">();

  // Track group stack to associate leaves with groups.
  // For each GroupRow, count how many body leaves it has.
  const groupBodyLeafCount = new Map<string, number>();

  // Initialize all group counts to 0
  for (const row of rows) {
    if (row.type === "group") {
      groupBodyLeafCount.set(row.groupId, 0);
    }
  }

  // Walk the flat array. Group rows define the "current" groups.
  // Each leaf follows its group ancestors in the flat array.
  const groupStack: GroupRow[] = [];
  for (const row of rows) {
    if (row.type === "group") {
      // Adjust stack to match current depth
      while (groupStack.length > 0 && groupStack[groupStack.length - 1]!.depth >= row.depth) {
        groupStack.pop();
      }
      groupStack.push(row);
    } else {
      const cls = classify(row, pinnedTopPredicate, pinnedBottomPredicate);
      leafClassification.set(row, cls);

      if (cls === "body") {
        // Increment count for all ancestor groups
        for (const g of groupStack) {
          groupBodyLeafCount.set(g.groupId, (groupBodyLeafCount.get(g.groupId) ?? 0) + 1);
        }
      }
    }
  }

  // Pass 2: Build the three partitions.
  const pinnedTop: GridRow<TData>[] = [];
  const body: GridRow<TData>[] = [];
  const pinnedBottom: GridRow<TData>[] = [];

  for (const row of rows) {
    if (row.type === "group") {
      const bodyCount = groupBodyLeafCount.get(row.groupId) ?? 0;
      if (bodyCount === 0) {
        // All leaves were pinned — skip group from body
        continue;
      }
      if (bodyCount !== row.leafCount) {
        // Clone with adjusted leafCount
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

  // Re-index each partition
  reindex(pinnedTop);
  reindex(body);
  reindex(pinnedBottom);

  return { pinnedTop, body, pinnedBottom };
}

function reindex<TData>(rows: GridRow<TData>[]): void {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.index !== i) {
      rows[i] = { ...row, index: i };
    }
  }
}
