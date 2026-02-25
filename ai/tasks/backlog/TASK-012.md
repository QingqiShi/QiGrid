# TASK-012: Rewrite useGrid with React-native state

**Phase:** 0 — Architecture refactor
**Blocked by:** TASK-011

## Why

After TASK-011 extracts pure functions from core, the React layer needs to stop using `useSyncExternalStore` and instead own state via React primitives. This unlocks concurrent features (`useTransition`, `useDeferredValue`) and lets React schedule updates properly.

## Goal

Rewrite `useGrid` to manage grid state internally using `useState`/`useReducer` and derive the row model through a `useMemo` pipeline calling core's pure transform functions.

## Acceptance criteria

### React (`@qigrid/react`)

- `useGrid` manages state with React primitives (useState, useReducer, or useRef — implementer's choice)
- Derived row model computed via `useMemo` chain: data → filter → sort → rows
- Each pipeline stage memoized independently (sorting doesn't re-run when only filters change, etc.)
- `useGrid` returns:
  - Current rows (the final pipeline output)
  - Column model
  - State (sorting, filters)
  - Updater functions (toggle sort, set filter, set column filter, etc.)
- No `useSyncExternalStore`, no `subscribe`, no external store pattern
- The hook is the primary API — consumers destructure what they need

### Playground

- Playground updated to work with the new `useGrid` return shape
- Sorting and filtering still work as before
- No visual regressions

### Tests

- Existing React tests adapted to the new API
- Existing Playwright e2e tests pass (playground behavior unchanged)
- Verify that `useMemo` stages memoize correctly (sort doesn't recompute when only data changes with same reference, etc.)

### What NOT to do

- Do not add `useTransition` or `useDeferredValue` yet — that's an optimization to add when we have expensive operations (100k rows). Just establish the React-native state foundation.
- Do not add new features — just rewrite the existing sort/filter/column behavior

## Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `cd apps/playground && npx playwright test` passes
