# TASK-029: Row Aggregation

**Phase:** 3 — Core features
**Blocked by:** TASK-017 (grouping)
**Enhanced by:** TASK-018 (group display types — aggregated values are most useful in singleColumn/multipleColumns modes where group rows have cells)

## Goal

Compute and display aggregate values for grouped rows. Each column can define an aggregation function (sum, avg, count, etc.) that produces a summary value for each group.

## Design

### Aggregation functions

Built-in functions:
- `sum` — numeric sum
- `avg` — numeric average
- `count` — count of non-null values
- `min` — minimum value (numeric or string comparison)
- `max` — maximum value (numeric or string comparison)
- `first` — first value in the group
- `last` — last value in the group

Custom function: `(values: unknown[]) => unknown`

### Configuration

`ColumnDef` gains an optional `aggFunc` field:

```typescript
type BuiltInAggFunc = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';
type AggFunc = BuiltInAggFunc | ((values: unknown[]) => unknown);

interface ColumnDef<TData> {
  // ... existing
  aggFunc?: AggFunc;
}
```

`Column<TData>` carries the resolved `aggFunc` (same as how `filterFn` and `sortingFn` flow through `buildColumnModel`).

### Computation

Aggregation happens during `flattenGroupedRows` (which already walks the group tree). For each `GroupNode`:

1. Collect leaf row values for each column with `aggFunc` using `node.rows` (which contains all leaf rows for that group at any nesting level)
2. Apply the aggregation function
3. Store results on the emitted `GroupRow`

This means `flattenGroupedRows` gains an optional `columns` parameter. When provided, it computes aggregations for columns with `aggFunc`.

### Type changes

**Core** — `GroupRow` gains:

```typescript
interface GroupRow {
  // ... existing
  aggregatedValues: Record<string, unknown>; // columnId → aggregated value (empty if no aggFuncs)
}
```

**Core** — `flattenGroupedRows` signature change:

```typescript
function flattenGroupedRows<TData>(
  groupedRows: GroupedRows<TData>,
  collapsedGroupIds: ReadonlySet<string>,
  columns?: Column<TData>[], // NEW — when provided, computes aggregations
): GridRow<TData>[]
```

### Rendering

How aggregated values display depends on the group display type (TASK-018):

- **groupRows mode**: `renderGroupRow` receives GroupRow with `aggregatedValues`. Consumer decides how to display (e.g., inline text like "Engineering (500) — Avg Salary: $105k").
- **singleColumn/multipleColumns modes** (TASK-018): Data column cells in group rows show `row.aggregatedValues[column.id]`. VirtualGrid renders them with the same cell formatting as leaf rows, or via `renderGroupCell` callback.

If TASK-018 is not yet implemented, aggregation still works — values are on GroupRow for `renderGroupRow` to use.

### Pipeline

Aggregation fits naturally into the existing pipeline:

```
data → filter → wrap Row[] → sort → group → flatten (+ aggregate) → virtualize
```

Aggregation computes from `node.rows` (the leaf rows for each group), which are the filtered + sorted rows. This means aggregated values reflect the current filter state — filtering to "Engineering" recalculates aggregations for the Engineering group only.

## Acceptance criteria

### Core (`@qigrid/core`)

- `AggFunc` and `BuiltInAggFunc` types exported
- `ColumnDef.aggFunc` optional field
- `Column.aggFunc` carries the resolved function (via `buildColumnModel`)
- `GroupRow.aggregatedValues` field (always present, empty `{}` when no aggFuncs)
- 7 built-in aggregation functions: sum, avg, count, min, max, first, last
- `flattenGroupedRows` computes aggregations when columns with `aggFunc` are provided
- Aggregation is correct for nested groups (parent group aggregates from ALL descendant leaves, not from child group aggregations)
- Pure function `resolveAggFunc(aggFunc: AggFunc): (values: unknown[]) => unknown` exported for testing/reuse

### React (`@qigrid/react`)

- `useGrid` passes column model to `flattenGroupedRows` so aggregation happens automatically
- No new state needed — aggregation is a derived computation
- `UseGridReturn` unchanged (GroupRow in `rows` already has `aggregatedValues`)

### Edge cases

- Column with `aggFunc` but no grouping active — no effect (no group rows to aggregate)
- `aggFunc: 'sum'` on non-numeric values — returns `NaN` or 0 (documented behavior)
- `aggFunc: 'avg'` with empty group (0 leaves after filtering) — returns `NaN` or 0
- `aggFunc: 'count'` with null/undefined values — counts non-null only
- Custom `aggFunc` receives empty array for empty groups
- Aggregation recalculates when filter changes (values reflect filtered data)
- Multi-level grouping: each level shows correct aggregation for its scope

### Playground

- Add `aggFunc: 'sum'` to the salary column definition
- Add `aggFunc: 'count'` to the ID column definition (or a dedicated "Count" display)
- In `groupRows` mode: group header shows aggregated values (e.g., "Engineering (500) — Total: $12.5M")
- If TASK-018 is done: in singleColumn/multipleColumns mode, salary column shows sum in group rows
- Format aggregated values appropriately (salary formatter, etc.)

### Tests

**Core (aggregation functions):**
- `sum` produces correct sum of numbers
- `avg` produces correct average
- `count` counts non-null values
- `min`/`max` return correct extremes
- `first`/`last` return first/last array elements
- Custom function is invoked with array of values
- Empty array input returns sensible defaults (0 for sum, NaN for avg, 0 for count)

**Core (flattenGroupedRows with aggregation):**
- GroupRow includes aggregatedValues for columns with aggFunc
- GroupRow.aggregatedValues is empty `{}` for columns without aggFunc
- Correct values for single-level grouping
- Correct values for multi-level grouping (parent aggregates all descendant leaves)
- Collapsed groups still have correct aggregated values
- Aggregation only computed when columns parameter is provided

**React:**
- useGrid produces GroupRows with aggregatedValues when columns have aggFunc
- Changing filters recalculates aggregated values
- No aggregation when no columns have aggFunc (baseline performance unchanged)

### Performance

- Benchmark: aggregate 5 columns across 100k rows with single-level grouping ≤ 10ms median
- No measurable regression to `flattenGroupedRows` when no columns have `aggFunc`

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm --filter @qigrid/playground e2e` — including new tests
