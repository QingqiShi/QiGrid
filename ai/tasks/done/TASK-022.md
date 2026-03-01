# TASK-022: Full pipeline integration tests

**Phase:** 3 — Core features (post-feature gate)
**Blocked by:** TASK-017, TASK-018, TASK-019

## Why

The plan identifies "pipeline interaction complexity" as a top risk: each pipeline stage interacts with every other, and bugs hide in cross-cutting interactions. Individual tasks test their own stage in isolation. This task writes the tests that exercise all stages composed together.

## Goal

Write integration tests that validate the full pipeline (`filter → sort → group → expand → flatten → virtualize`) works correctly when multiple features are active simultaneously.

## Scope adjustment

The following acceptance criteria reference "expand" / "detail rows" (expanding a leaf row to show detail content). **This feature does not exist** — there's no `expandedRowIds` state, no detail row type, no expansion mechanism for individual rows. The only expand/collapse is for groups via `collapsedGroupIds`. These criteria were skipped:
- "group + expand: expand a leaf row within a group, detail row appears in correct position"
- "Sort while a row is expanded → expanded row moves to new position, detail row follows"
- "Expand a row, then filter it away → detail row hidden, expansion state preserved"
- "Expand a row within a group, scroll, collapse the group, verify no glitches"

## Acceptance criteria

### Core integration tests

- [x] filter + sort: filtered rows are sorted correctly
- [x] filter + group: groups reflect filtered data, empty groups are excluded
- [x] sort + group: rows within groups are sorted
- [x] filter + sort + group: all three composed
- [x] ~~group + expand~~ (skipped — feature doesn't exist)
- [x] group + collapse: collapse a group, its children disappear
- [x] Full pipeline: filter + sort + group + flatten + virtualize — verify visible rows are correct

### State transition tests

- [x] Add a filter while grouped → groups recompute, expanded groups stay expanded if still present
- [x] Collapse a group while filtered → collapse state preserved when filter is removed
- [x] ~~Sort while a row is expanded~~ (skipped — feature doesn't exist)
- [x] Change grouping columns while rows are expanded → expansion state resets
- [x] ~~Scroll while grouped and expanded~~ (covered by virtualize tests)

### Edge cases

- [x] All rows filtered out while grouped → empty state
- [x] ~~Expand a row, then filter it away~~ (skipped — feature doesn't exist)
- [x] Group by column where all values are identical → single group
- [x] Multi-level group + virtualize with overscan

### Playwright e2e integration tests

- [x] Load playground with grouping + sorting + filtering all active
- [x] ~~Expand a row within a group, scroll, collapse the group~~ (skipped — feature doesn't exist)
- [x] Keyboard-navigate through grouped rows
- [x] Collapse then filter and uncollapse persistence
- [x] Change grouping resets collapse state
- [x] Filter reduces group leaf counts

## Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `cd apps/playground && npx playwright test` passes
