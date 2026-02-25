# TASK-011: Refactor core to stateless pure functions

**Phase:** 0 — Architecture refactor
**Blocked by:** none

## Why

The current core (`createGrid()`) is a stateful engine — it owns state, exposes subscribe/getState, and manages its own notification system. This forces React into an external-store bridge pattern (`useSyncExternalStore`), which deoptimizes concurrent rendering. Since we have no cross-framework requirement, core should be stateless and let React own state and scheduling.

## Goal

Refactor `@qigrid/core` from a stateful `createGrid()` factory to a library of pure transform functions. Each function takes data in and returns transformed data out — no state, no subscriptions, no side effects.

## Acceptance criteria

### Core (`@qigrid/core`)

- Export pure transform functions for each pipeline stage:
  - Sorting: takes rows + sorting state, returns sorted rows
  - Filtering: takes rows + column filters + column defs, returns filtered rows
  - Column model: takes column defs, returns resolved columns with getValue
- Each function is independently importable and tree-shakeable
- No internal state, no subscribe/notify pattern, no `Listener`/`Unsubscribe` types
- `createGrid` may remain temporarily for backwards compat but should not be the recommended API
- Types updated: remove `GridState`, `GridInstance`, `Listener`, `Unsubscribe` (or deprecate)
- `Row`, `Column`, `ColumnDef`, `ColumnSort`, `ColumnFilter` types preserved

### Tests

- Existing sort/filter unit tests adapted to call pure functions directly
- Same behavioral coverage — just different call sites
- All tests pass

### What NOT to do

- Do not touch `@qigrid/react` or the playground — TASK-012 handles that
- Do not add new features (grouping, virtualization, etc.) — just refactor what exists

### Benchmark regression check

- Re-run existing sort/filter benchmarks after refactor
- Confirm no performance regression vs. the stateful `createGrid` implementation
- If any benchmark regresses by > 20%, investigate before proceeding

## Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm turbo bench` shows no regressions
