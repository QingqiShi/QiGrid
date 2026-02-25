# TASK-010: Column filtering

- **Assignee:** —
- **Blocked by:** TASK-007, TASK-008

## Acceptance criteria

### Core (`@qigrid/core`)
- `GridOptions` accepts an optional `columnFilters` state: `{ columnId: string; value: unknown }[]`
- `GridState` includes `columnFilters` as part of the state
- The grid instance exposes `setColumnFilters(filters)` to update filter state and trigger row model recomputation
- The grid instance exposes `setColumnFilter(columnId, value)` convenience method for single-column filter updates
- When filters are active, `getRows()` returns only rows matching all active filters (AND logic)
- Default filter function: case-insensitive string `includes` for string values, strict equality for numbers/booleans
- `ColumnDef` gains optional `filterFn?: (value: unknown, filterValue: unknown) => boolean` for custom filter logic
- Filtering is applied before sorting in the row model pipeline (filter → sort → return)
- Filtering does not mutate the original `data` array
- Unit tests cover: single column filter, multi-column filter (AND), custom filterFn, clearing filters restores all rows, filter + sort interaction, empty results, filter + data update interaction

### React (`@qigrid/react`)
- Filter state changes trigger React re-renders via the existing state bridge
- No additional React-specific filtering code needed

### Playground
- Add a text input above each column (or a filter row below headers) for entering filter values
- Filtering is live (filters as user types)
- Row count display updates to show filtered count vs total (e.g., "Showing 23 of 100 rows")
- Demonstrate filtering working alongside sorting (both active simultaneously)

### Quality
- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- Existing Playwright e2e test still passes (or is updated to account for filter UI)

## Implementation notes

- **Combined with TASK-009 (sorting)** in a single commit (`e587983`) on branch `task-010/column-filtering`. A worktree hook auto-merged TASK-009 code.
- **Core types**: `ColumnFilter`, `ColumnFiltersState`. `filterFn?` on `ColumnDef`. `columnFilters` on `GridOptions`, `GridState`, `GridInstance`. `setColumnFilters` and `setColumnFilter` methods.
- **Core implementation**: `defaultFilterFn` — case-insensitive `includes` for strings, strict `===` for numbers/booleans. `filterData` applies AND logic. `setColumnFilter` convenience method auto-removes filter on empty/null/undefined values. Row model pipeline: filter -> sort -> return. `setColumns` only recomputes row model when filters or sorting active.
- **React**: `useEffect` sync for `columnFilters` option (same pattern as data/columns).
- **Playground**: Filter text inputs below each column header with live filtering, "Showing X of Y rows" display, CSS with focus states, accessible aria-labels.
- **Tests**: 23 filtering tests in `packages/core/src/__tests__/columnFiltering.test.ts`.
- **E2e fixes**: Updated `grid.spec.ts` (scoped header count to first thead row) and regenerated visual regression baselines (commit `cbed65c`).
- **Verification**: 88 unit tests pass (80 core + 8 react). 4 Playwright e2e tests pass. Build, lint, check all pass.

## Notes

Filtering is the second feature exercising the reactive pipeline. It shares the same state → subscribe → re-render flow as sorting, which validates that the architecture generalizes to multiple features.

The row model pipeline order matters: filter first (reduce the dataset), then sort (order the reduced set). This is more efficient and matches user expectations. The pipeline will later extend to: filter → sort → group → virtualize.
