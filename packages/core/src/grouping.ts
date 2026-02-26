import type { Column, GridRow, GroupedRows, GroupNode, GroupRow, LeafRow, Row } from "./types";

function serializeGroupValue(value: unknown): string {
  if (value == null) return "__null__";
  return String(value);
}

/**
 * Group rows into a tree structure by one or more column IDs.
 * Uses Map-based bucketing, O(n) per grouping level.
 */
export function groupRows<TData>(
  rows: Row<TData>[],
  grouping: string[],
  columns: Column<TData>[],
): GroupedRows<TData> {
  if (grouping.length === 0) return [];

  const columnMap = new Map(columns.map((c) => [c.id, c]));
  return buildGroupLevel(rows, grouping, 0, "", columnMap);
}

function buildGroupLevel<TData>(
  rows: Row<TData>[],
  grouping: string[],
  depth: number,
  parentGroupId: string,
  columnMap: Map<string, Column<TData>>,
): GroupNode<TData>[] {
  const columnId = grouping[depth];
  if (columnId === undefined) return [];

  const column = columnMap.get(columnId);
  if (!column) return [];

  // Bucket rows by group value, preserving insertion order via Map
  const buckets = new Map<string, { value: unknown; rows: Row<TData>[] }>();

  for (const row of rows) {
    const value = column.getValue(row.original);
    const key = serializeGroupValue(value);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { value, rows: [] };
      buckets.set(key, bucket);
    }
    bucket.rows.push(row);
  }

  const nodes: GroupNode<TData>[] = [];
  const nextDepth = depth + 1;
  const hasMoreLevels = nextDepth < grouping.length;

  for (const [key, bucket] of buckets) {
    const groupId = parentGroupId ? `${parentGroupId}>${columnId}:${key}` : `${columnId}:${key}`;
    const children = hasMoreLevels
      ? buildGroupLevel(bucket.rows, grouping, nextDepth, groupId, columnMap)
      : [];

    nodes.push({
      columnId,
      groupValue: bucket.value,
      groupId,
      rows: bucket.rows,
      children,
    });
  }

  return nodes;
}

/**
 * Count all leaf rows under a group node recursively.
 */
function countLeaves<TData>(node: GroupNode<TData>): number {
  if (node.children.length === 0) return node.rows.length;
  let count = 0;
  for (const child of node.children) {
    count += countLeaves(child);
  }
  return count;
}

/**
 * Flatten a grouped tree into a sequential array of GridRow items.
 * Collapsed groups (in collapsedGroupIds) have their children omitted.
 * Assigns sequential indices for virtualization.
 */
export function flattenGroupedRows<TData>(
  groupedRows: GroupedRows<TData>,
  collapsedGroupIds: ReadonlySet<string>,
): GridRow<TData>[] {
  const result: GridRow<TData>[] = [];
  flattenLevel(groupedRows, collapsedGroupIds, 0, result);
  return result;
}

function flattenLevel<TData>(
  nodes: GroupNode<TData>[],
  collapsedGroupIds: ReadonlySet<string>,
  depth: number,
  result: GridRow<TData>[],
): void {
  for (const node of nodes) {
    const isExpanded = !collapsedGroupIds.has(node.groupId);
    const leafCount = countLeaves(node);

    const groupRow: GroupRow = {
      type: "group",
      index: result.length,
      groupId: node.groupId,
      columnId: node.columnId,
      groupValue: node.groupValue,
      depth,
      leafCount,
      isExpanded,
    };
    result.push(groupRow);

    if (!isExpanded) continue;

    if (node.children.length > 0) {
      flattenLevel(node.children, collapsedGroupIds, depth + 1, result);
    } else {
      for (const row of node.rows) {
        const leafRow: LeafRow<TData> = {
          type: "leaf",
          index: result.length,
          original: row.original,
          getValue: row.getValue,
        };
        result.push(leafRow);
      }
    }
  }
}
