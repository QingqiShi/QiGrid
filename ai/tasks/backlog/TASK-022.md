# TASK-022: Full pipeline integration tests

**Phase:** 3 — Core features (post-feature gate)
**Blocked by:** TASK-017, TASK-018, TASK-019

## Why

The plan identifies "pipeline interaction complexity" as a top risk: each pipeline stage interacts with every other, and bugs hide in cross-cutting interactions. Individual tasks test their own stage in isolation. This task writes the tests that exercise all stages composed together.

## Goal

Write integration tests that validate the full pipeline (`filter → sort → group → expand → flatten → virtualize`) works correctly when multiple features are active simultaneously.

## Acceptance criteria

### Core integration tests

- filter + sort: filtered rows are sorted correctly
- filter + group: groups reflect filtered data, empty groups are excluded
- sort + group: rows within groups are sorted
- filter + sort + group: all three composed
- group + expand: expand a leaf row within a group, detail row appears in correct position
- group + collapse: collapse a group, its children and any expanded detail rows disappear
- Full pipeline: filter + sort + group + expand + flatten + virtualize — verify visible rows are correct

### State transition tests

- Add a filter while grouped → groups recompute, expanded groups stay expanded if still present
- Collapse a group while filtered → collapse state preserved when filter is removed
- Sort while a row is expanded → expanded row moves to new position, detail row follows
- Change grouping columns while rows are expanded → expansion state resets (or remains, per design decision)
- Scroll while grouped and expanded → correct rows rendered

### Edge cases

- All rows filtered out while grouped → empty state
- Expand a row, then filter it away → detail row hidden, expansion state preserved
- Group by column where all values are identical → single group
- Multi-level group + expand + virtualize with overscan

### Playwright e2e integration tests

- Load playground with grouping + sorting + filtering all active
- Expand a row within a group, scroll, collapse the group, verify no glitches
- Keyboard-navigate through grouped/expanded rows

## Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `cd apps/playground && npx playwright test` passes
