# TASK-015: Row expansion / detail views

**Phase:** 3 — Core features
**Blocked by:** TASK-014 (shares expand/collapse mechanics and row type discriminator)

## Goal

Allow individual rows to be expanded to show a detail view. Expanded rows insert a detail row below the original. Works with virtualization (expanded rows affect virtual height).

## Acceptance criteria

### Core (`@qigrid/core`)

- `GridState` includes `expandedRowIds: Set<string>` (or equivalent, keyed by row index or a user-provided `getRowId`)
- `GridOptions` accepts optional `getRowId?: (row: TData) => string` for stable row identity
- `GridInstance` exposes `toggleRowExpanded(rowId: string)` and `setExpandedRowIds(ids: Set<string>)`
- When a row is expanded, a detail row (`type: 'detail'`, `parentRowId`) is inserted after it in `getRows()`
- Detail rows participate in virtualization (count toward totalHeight, can be windowed)
- `Row` type gains `isExpanded: boolean` for expanded leaf rows

### Edge cases

- Expand/collapse while scrolled mid-list (no scroll jump)
- Expand all / collapse all
- Expanded row removed by filter (expansion state preserved, detail row hidden)
- Works with grouping (expand a leaf row within a group)

### Playground

- Click a row to expand it, showing a detail panel below
- Detail panel shows additional row data (e.g., full employee record)
- Expand/collapse is visually indicated (chevron icon or similar)

### Tests

- Toggle expand inserts detail row
- Toggle collapse removes detail row
- Expanded rows affect `getRows()` count
- Virtualization accounts for detail rows in totalHeight
- Filter hides expanded row → detail row also hidden
- `getRowId` used for stable identity when provided
- Works alongside grouping

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
