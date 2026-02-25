# TASK-017: Row expansion / detail views

**Phase:** 3 — Core features
**Blocked by:** TASK-016 (shares expand/collapse mechanics and row type discriminator)

## Goal

Allow individual rows to be expanded to show a detail view. Expanded rows insert a detail row below the original. Works with virtualization (expanded rows affect virtual height).

## Acceptance criteria

### Core (`@qigrid/core`)

- Pure function to insert detail rows: takes flat row list + expanded row IDs + optional getRowId → returns rows with detail rows inserted after expanded entries
- Detail rows have `type: 'detail'` and reference their parent row
- Leaf rows gain an `isExpanded` flag

### React (`@qigrid/react`)

- `useGrid` (or companion hook) manages expanded row IDs state
- Exposes updaters to toggle row expansion and set expanded IDs
- Optional `getRowId` for stable row identity (falls back to index)

### Edge cases

- Expand/collapse while scrolled mid-list (no scroll jump)
- Expand all / collapse all
- Expanded row removed by filter (expansion state preserved, detail row hidden)
- Works with grouping (expand a leaf row within a group)

### Playground

- Click a row to expand it, showing a detail panel below
- Detail panel shows additional row data
- Expand/collapse is visually indicated

### Tests

- Toggle expand inserts detail row
- Toggle collapse removes detail row
- Expanded rows affect row count
- Virtualization accounts for detail rows in totalHeight
- Filter hides expanded row → detail row also hidden
- Works alongside grouping

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
