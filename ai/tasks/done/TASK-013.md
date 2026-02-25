# TASK-013: Architecture review checkpoint

**Phase:** 0 — Architecture refactor (post-refactor gate)
**Blocked by:** TASK-012
**Status:** Done

## Why

TASK-011 and TASK-012 are a major structural rewrite — converting from a stateful engine to stateless pure functions + React-native state. Every subsequent task builds on this foundation. A quick review before Phase 1 prevents compounding design problems through 10 more tasks.

## Goal

Validate that the refactored architecture is ready for Phase 1+ features. This is a review task, not an implementation task.

## Checklist

### Pipeline type composition

- [x] Verify the pipeline stages compose cleanly: can you type-check a chain of `filter → sort → group → expand → flatten → virtualize` with consistent input/output types?
  - `filterRows` operates on `TData[]` (pre-wrapping optimization), all other stages on `Row<TData>[]`. The bridge is the row-wrapping step in useGrid Stage 3. Future stages compose cleanly after wrapping.
- [x] Each transform takes rows in, returns rows out (or a structure that flattens to rows)
  - Yes, with the documented exception that `filterRows` operates pre-wrapping on `TData[]`.
- [x] The type system supports future row type discriminators (`'leaf' | 'group' | 'detail'`) without breaking existing transforms
  - Not yet present, but `Row<TData>` is simple enough that adding `type?: 'leaf' | 'group' | 'detail'` or a discriminated union is additive and non-breaking. No transform checks for a `type` field today.

### Tree-shakeability

- [x] Each transform function is independently importable from `@qigrid/core`
  - All exports are named: `filterRows`, `sortRows`, `buildColumnModel`, `buildRowModel`, `createGrid`. Each from a separate module file.
- [x] Unused transforms are eliminated by the bundler (verify with a minimal import + build)
  - React package imports only `filterRows`, `sortRows`, `buildColumnModel` — never `createGrid` or `buildRowModel`. tsdown/rolldown supports tree-shaking via named ESM exports.

### `useGrid` API surface

- [x] The return shape of `useGrid` can accommodate all planned features without breaking changes:
  - Sorting state + updaters (already exists)
  - Filter state + updaters (already exists)
  - Column width state + updaters (TASK-014) — additive: new optional field on GridOptions, new state + updater on return
  - Grouping state + updaters (TASK-017) — additive: new grouping state + updater
  - Expansion state + updaters (TASK-018) — additive: new expandedRows state + updater
  - Keyboard focus state + updaters (TASK-019) — additive: new focusedCell state + navigation functions
- [x] The hook accepts options for features not yet implemented without error (forward-compatible shape)
  - `GridOptions` uses optional fields. New features add new optional fields — existing consumers unaffected.

### Memoization boundaries

- [x] Each `useMemo` stage has correct dependency arrays
  - Stage 1 (columnModel): `[columnDefs]`
  - Stage 2 (filteredData): `[data, state.columnFilters, columnDefs]`
  - Stage 3 (rowsBeforeSort): `[filteredData, columnModel]`
  - Stage 4 (rows): `[rowsBeforeSort, state.sorting, columnDefs]`
- [x] Changing sort state does NOT recompute filtering
  - Confirmed: sort only affects Stage 4 deps.
- [x] Changing filter state does NOT recompute sorting (but does recompute downstream)
  - Confirmed: filter change -> Stage 2 recomputes -> Stage 3 (new rows) -> Stage 4 (re-sort new rows). Sort logic runs on new input but filter doesn't trigger sort directly.

### Documentation sync

- [x] Update CLAUDE.md if the refactor changes any workflow instructions
  - CLAUDE.md is current. No stale references to old architecture.
- [x] Update MEMORY.md to reflect the new architecture (remove stale references to `createGrid`, `useSyncExternalStore`)
  - Updated: task progress, architecture summary, removed stale branch references.

## Minor observations (not blockers)

1. `filterRows` internally calls `buildColumnModel(columnDefs)` on every invocation, even though `useGrid` already has a memoized column model. Could accept a pre-built column model for efficiency, but not a problem at current scale.
2. `createGrid` (stateful engine) is still exported and tested — fine as a non-React API surface, tree-shakeable.
3. `GridInstance`, `GridState`, `Listener`, `Unsubscribe` types are exported from core but unused by React — no harm, provides flexibility for non-React consumers.

## Quality gate

- [x] `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass (82 core + 12 react tests)
- [x] All checklist items verified
