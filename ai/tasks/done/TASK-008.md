# TASK-008: React useSyncExternalStore bridge

- **Assignee:** —
- **Blocked by:** TASK-006

## Acceptance criteria

- `useGrid` is rewritten to use `useSyncExternalStore` from React to subscribe to the core grid instance's state
- The hook creates the grid instance once (on mount) and subscribes to its state changes
- When grid state changes (e.g., via `setData`), the React component re-renders with the new state
- `useGrid` returns a stable `GridInstance` reference (the instance itself doesn't change between renders — only its state does)
- When `options.data` or `options.columns` change (new reference), `useGrid` calls `setData`/`setColumns` on the existing instance rather than recreating it
- The hook properly cleans up subscriptions on unmount
- No unnecessary re-renders: changing data re-renders, but calling `getRows()` without a state change does not
- Unit tests cover: initial render returns correct data, updating data prop triggers re-render with new rows, stable instance reference across re-renders, unmount cleans up subscription
- All existing tests still pass (backward compatible or migrated)
- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass

## Implementation notes

- **`packages/react/src/useGrid.ts`** — Rewrote from `useMemo` to `useRef` + `useSyncExternalStore`:
  - Grid instance created once via `useRef` (null-check pattern, stable even in StrictMode)
  - `useSyncExternalStore(grid.subscribe, grid.getState)` subscribes React to core grid state changes — handles concurrent mode and avoids tearing
  - Two `useEffect` hooks sync `options.data` and `options.columns` prop changes to the existing instance via `setData`/`setColumns` with reference equality guards
  - No new dependencies — `useSyncExternalStore` is built into React 18+
- **`packages/react/src/__tests__/useGrid.test.tsx`** — Expanded from 1 test to 8 tests: initial render, rows match data, data prop change re-renders, columns prop change re-renders, stable instance reference, direct `setData` triggers re-render, unmount cleanup, same options stability.
- **Key decisions**: `useRef` over `useMemo` for guaranteed single-creation; `useEffect` for syncing props to avoid side effects during render; reference equality checks to skip no-op updates.
- **Verification on main**: 30 tests pass (22 core + 8 react). Build, lint, check all pass.
- **Commit**: `2b8f22f` — fast-forward merged to main.

## Notes

This is the critical React integration point. `useSyncExternalStore` is the recommended React 18+ way to subscribe to external stores — it handles concurrent mode correctly and avoids tearing.

The pattern:
```typescript
const state = useSyncExternalStore(
  grid.subscribe,
  grid.getState
);
```

TASK-006 designs the subscribe/getState API specifically to plug into this. TASK-007 (column model) can be developed in parallel with this task since they touch different packages.
