# TASK-009: Column sorting

- **Assignee:** —
- **Blocked by:** TASK-007, TASK-008

## Acceptance criteria

### Core (`@qigrid/core`)
- `GridOptions` accepts an optional `sorting` state: `{ columnId: string; direction: 'asc' | 'desc' }[]` (multi-column sort array)
- `GridState` includes `sorting` as part of the state
- The grid instance exposes `setSorting(sorting)` to update sorting state and trigger row model recomputation
- The grid instance exposes `toggleSort(columnId: string)` convenience method: no sort → asc → desc → no sort cycle
- When sorting state is non-empty, `getRows()` returns rows sorted by the specified columns in order (first sort column is primary, second is secondary, etc.)
- Default comparator handles strings (locale-aware), numbers, dates, nulls/undefined (sorted last)
- `ColumnDef` gains optional `sortingFn?: (a: unknown, b: unknown) => number` for custom comparators
- Sorting does not mutate the original `data` array
- Unit tests cover: single column sort asc/desc, multi-column sort, toggle cycle, custom sortingFn, null handling, empty data, sort + data update interaction

### React (`@qigrid/react`)
- Sorting state changes via `setSorting`/`toggleSort` trigger React re-renders (via the useSyncExternalStore bridge from TASK-008)
- No additional React-specific sorting code needed — it flows through the existing state bridge

### Playground
- Column headers in the playground become clickable to toggle sorting
- Visual indicator (arrow or similar) shows current sort direction on sorted columns
- Sorting works correctly with the 100-row employee dataset (verify numeric sort on salary, string sort on names, etc.)

### Quality
- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- Existing Playwright e2e test still passes

## Implementation notes

- **Merged as part of TASK-010 branch** (`task-010/column-filtering`, commit `e587983`). TASK-009 sorting code was combined with TASK-010 filtering code in a single commit due to a worktree hook auto-merge.
- **Types**: `ColumnSort`, `SortingState` types. `sortingFn?` on `ColumnDef`. `sorting` on `GridOptions`, `GridState`, `GridInstance`. `setSorting` and `toggleSort` methods.
- **Implementation**: `defaultComparator` handles strings (localeCompare), numbers, dates, nulls/undefined (sorted last). `sortRows` supports multi-column sorting. `toggleSort` cycles: none -> asc -> desc -> none. Row model pipeline: filter -> sort -> return.
- **Playground**: Clickable column headers with sort indicators (up/down arrows). `getSortIndicator` helper.
- **Tests**: 24 sorting tests in `packages/core/src/__tests__/sorting.test.ts`.
- **Verification**: All 88 unit tests pass (80 core + 8 react). All 4 Playwright e2e tests pass (baselines updated).

## Notes

This is the first real feature that exercises the full stack: core state mutation → subscriber notification → React re-render → updated UI. It validates that the reactive state model (TASK-006) and useSyncExternalStore bridge (TASK-008) work correctly end-to-end.

Sorting is intentionally the first feature because it's well-understood, user-visible, and tests the reactive pipeline without virtualization complexity.
