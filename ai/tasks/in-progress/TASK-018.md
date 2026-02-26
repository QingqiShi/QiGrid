# TASK-018: Group Display Types

**Phase:** 3 — Core features
**Blocked by:** TASK-017 (grouping)

## Goal

Support three display modes for how grouped rows appear in the grid:

1. **Group Rows** (`groupRows`) — full-width group headers, current behavior, default
2. **Single Group Column** (`singleColumn`) — one auto-generated column showing the group hierarchy as a tree
3. **Multiple Group Columns** (`multipleColumns`) — one auto-generated column per grouping level

## Design

### Mode: `groupRows` (default, no changes)

- Group rows span full width, rendered via `renderGroupRow`
- Leaf rows have cells for each data column
- No auto-generated columns
- This is what TASK-017 implemented

### Mode: `singleColumn`

- A single auto-generated group column is prepended to the column model
- ALL rows (group and leaf) have cells in all columns
- Group column cell rendering:
  - Group rows: expand/collapse toggle + group value, indented by `depth`
  - Leaf rows: empty (indented to match parent depth + 1)
- Data column cell rendering:
  - Group rows: empty (later: aggregated values via separate aggregation task)
  - Leaf rows: normal cell values via `renderCell`

### Mode: `multipleColumns`

- One auto-generated column per grouping level, prepended to the column model
- ALL rows have cells in all columns
- Group column cell rendering:
  - Group rows: toggle + value only in the column matching `row.columnId`; empty in other group columns
  - Leaf rows: empty in all group columns
- Data column cell rendering: same as `singleColumn`

### Auto-generated columns

- ID convention: `qigrid:group` (singleColumn) or `qigrid:group:${columnId}` (multipleColumns)
- Header: `"Group"` (singleColumn) or matches the grouped column's header (multipleColumns)
- Default width: 200px, min 100px, max 600px
- Generated only when grouping is active (`grouping.length > 0`)
- Identified via `Column.groupFor` field: `'*'` for singleColumn, `columnId` for multipleColumns

### Column hiding

When `singleColumn` or `multipleColumns` is active, the original data columns being grouped by are redundant (the hierarchy already shows the grouped values). Option: `hideGroupedColumns?: boolean` (default `true` for singleColumn/multipleColumns, ignored for groupRows). When true, columns whose IDs appear in the grouping array are excluded from the returned column model.

### Type changes

**Core** — `Column<TData>` gains one optional field:

```typescript
/** Set by useGrid for auto-generated group columns. '*' = singleColumn, columnId = multipleColumns. */
groupFor?: string;
```

**Core** — new type:

```typescript
type GroupDisplayType = 'groupRows' | 'singleColumn' | 'multipleColumns';
```

**GroupRow stays unchanged** — no `getValue` needed. VirtualGrid renders group cells from GroupRow properties directly.

## Acceptance criteria

### Core (`@qigrid/core`)

- `GroupDisplayType` exported from core types
- `Column<TData>` has optional `groupFor?: string` field
- Utility function `buildGroupColumns<TData>(grouping: string[], displayType: GroupDisplayType, columns: Column<TData>[]): Column<TData>[]` — returns auto-generated group column(s), or empty array for `groupRows` mode

### React (`@qigrid/react`)

- `UseGridOptions` accepts `groupDisplayType?: GroupDisplayType` (default `'groupRows'`)
- `UseGridOptions` accepts `hideGroupedColumns?: boolean` (default `true` for singleColumn/multipleColumns)
- `useGrid` auto-generates and prepends group column(s) when display type is singleColumn or multipleColumns and grouping is active
- `useGrid` excludes grouped data columns from the column model when `hideGroupedColumns` is true
- `UseGridReturn` includes `groupDisplayType: GroupDisplayType`
- `VirtualGridProps` accepts `groupDisplayType?: GroupDisplayType`
- `VirtualGrid` renders group rows as regular rows with cells in singleColumn/multipleColumns modes
- Built-in default rendering for group cells: expand/collapse toggle + value in group columns, empty in data columns
- New optional callback: `renderGroupCell?: (row: GroupRow, column: Column<TData>) => React.ReactNode` — overrides default group cell rendering in singleColumn/multipleColumns modes
- `renderGroupRow` is only used in `groupRows` mode (backward compatible)

### Edge cases

- `groupDisplayType` set to singleColumn/multipleColumns with empty grouping (`grouping: []`) — no group columns generated, renders like ungrouped grid
- Switching display type at runtime — should re-render correctly, selection should clear (column indices change)
- Single-level grouping in multipleColumns mode — one group column
- Multi-level grouping in singleColumn mode — all levels in one column, indented
- Group columns are sortable — clicking sorts groups by their group value (alphabetical, numeric, etc.). With aggregation (TASK-029), sorting a data column in a group row context could sort groups by aggregated value.
- Group columns do NOT have filter inputs (filtering is on the source data, not the group structure)
- Selection can include group column cells — they're part of the cell grid
- Copy/paste still skips group rows (group rows lack `getValue`)
- Keyboard navigation works across group columns like any other column

### Playground

- Add display type radio buttons or dropdown alongside existing "Group by" control
- Demo all three modes with "Group by Department" data
- singleColumn mode shows tree hierarchy in first column
- multipleColumns mode shows one column per grouping level
- Group rows show expand/collapse toggles in group column cells
- Appropriate indentation in singleColumn mode

### Tests

**Core:**
- `buildGroupColumns` returns correct columns for each display type
- Returns empty array for `groupRows` mode
- Returns empty array when grouping is empty
- Column IDs follow convention
- Headers derived from grouped columns in multipleColumns mode

**React (useGrid):**
- `groupDisplayType: 'singleColumn'` prepends one group column when grouping is active
- `groupDisplayType: 'multipleColumns'` prepends N columns (one per grouping level)
- `groupDisplayType: 'groupRows'` does not add group columns (backward compat)
- `hideGroupedColumns` removes grouped data columns from column model
- Returned `totalWidth` includes group column widths
- Selection indices account for prepended group columns
- Changing `groupDisplayType` works reactively (column model updates)

**React (VirtualGrid):**
- groupRows mode renders full-width group rows (existing behavior, no regression)
- singleColumn mode renders group rows with cells, group column shows toggle + value
- multipleColumns mode renders group rows with cells, correct column shows content
- Leaf rows in singleColumn/multipleColumns have empty group column cells
- `renderGroupCell` callback invoked for group row cells in non-groupRows modes

**E2E (Playground):**
- Switch to singleColumn mode — group column appears, group rows have cells
- Switch to multipleColumns mode — per-level columns appear
- Switch back to groupRows — full-width group headers return
- Expand/collapse works in all three modes
- Grouped data columns are hidden in singleColumn/multipleColumns modes

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm --filter @qigrid/playground e2e` — including new tests
