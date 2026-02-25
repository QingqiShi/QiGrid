# TASK-021: Concurrent rendering optimization

**Phase:** 3 — Core features
**Blocked by:** TASK-016

## Why

The plan's architecture states React owning state "lets React schedule updates properly" and enables `useTransition` / `useDeferredValue`. TASK-012 established the React-native state foundation but explicitly deferred these optimizations. With 100k-row datasets, expensive operations like sort/filter/group will block the main thread during state transitions, likely busting the ≤16ms scroll update target.

## Goal

Wrap expensive grid state transitions in React concurrent features so the UI stays responsive during large dataset operations.

## Acceptance criteria

### React (`@qigrid/react`)

- Sorting, filtering, and grouping state transitions wrapped in `useTransition`
- While a transition is pending, the grid continues to render the previous state (no blank/loading flash)
- `useGrid` exposes an `isPending` flag for each transition type (or a single combined flag)
- Consumers can show a loading indicator based on `isPending`
- Scroll updates are NOT wrapped in transitions (they must be synchronous for smooth scrolling)

### Performance validation

- Sort 100k rows: UI thread stays responsive (no long tasks > 50ms during the transition)
- Filter 100k rows: same
- Scroll update with 100k rows: ≤ 16ms (one frame) — verify this is not regressed by transition wrapping

### Playground

- Add a visual "updating..." indicator when transitions are pending
- Demonstrate with 100k rows: click sort header, grid shows indicator briefly, then updates

### Tests

- Unit test: `isPending` is true during transition, false after
- Unit test: scroll updates are synchronous (not deferred)
- Playwright e2e: sort 10k+ rows, verify no blank frame during update

### What NOT to do

- Do not use `useDeferredValue` on the data prop — it would cause the entire pipeline to re-derive on every render
- Do not wrap virtualization/scroll in transitions — scrolling must be immediate

## Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm turbo bench` — rendering benchmarks still pass
- `cd apps/playground && npx playwright test` passes
