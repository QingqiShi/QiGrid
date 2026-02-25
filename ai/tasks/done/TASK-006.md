# TASK-006: Core reactive state model

- **Assignee:** —
- **Blocked by:** TASK-004

## Acceptance criteria

- `createGrid` returns a grid instance backed by a mutable state store (not a plain static object)
- The store holds `GridState` containing at minimum: `data`, `columns`, and a `rowModel` (cached row array)
- The grid instance exposes `subscribe(listener)` returning an unsubscribe function — listeners are called synchronously whenever state changes
- The grid instance exposes `getState(): GridState<TData>` for snapshot reads
- The grid instance exposes `setState(updater)` (or targeted setters like `setData`, `setColumns`) to mutate state and notify subscribers
- Calling `setData(newData)` replaces the data and recomputes the row model; subscribers are notified
- Calling `setColumns(newColumns)` replaces the columns; subscribers are notified
- `getRows()` returns the current row model from state (not recomputed on every call)
- Row model is lazily recomputed only when data changes, and cached until the next data change
- The store and all types remain framework-agnostic (no React imports in `@qigrid/core`)
- All existing tests still pass (existing `createGrid` API is preserved or migrated)
- New unit tests cover: subscribe/unsubscribe, setData triggers recompute + notification, setColumns triggers notification, getState returns current snapshot, multiple subscribers, unsubscribe stops notifications
- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass

## Implementation notes

- **`packages/core/src/types.ts`** — Added `GridState<TData>` (holds `data`, `columns`, `rowModel`), `Listener`, `Unsubscribe` types. Extended `GridInstance<TData>` with `getState`, `setState`, `setData`, `setColumns`, `subscribe` methods.
- **`packages/core/src/createGrid.ts`** — Rewrote to use a mutable `let state: GridState<TData>` closure. `data`/`columns` exposed as getter properties reading from state (backward compatible). Row model computed eagerly on data change via `buildRowModel()` and cached. `getRows()` returns cached `state.rowModel` — zero computation on read. `subscribe` uses `Set<Listener>` for O(1) add/remove and safe double-unsubscribe. `setState` only recomputes row model when `data` actually changes.
- **`packages/core/src/index.ts`** and **`packages/react/src/index.ts`** — Export/re-export new types `GridState`, `Listener`, `Unsubscribe`.
- **`packages/core/src/__tests__/reactiveState.test.ts`** — 20 new unit tests covering: getState snapshot, subscribe/unsubscribe, multiple subscribers, setData recompute + notification, setColumns notification without row model recompute, setState partial merge, updater function receives prev state, double unsubscribe safety, getRows caching behavior.
- **Design decision**: Row model uses eager recomputation (built immediately in `setData`/`setState`) rather than lazy. This ensures the state snapshot is always consistent, which is important for `useSyncExternalStore` compatibility in TASK-008.
- **Verification on main**: 23 tests pass (22 core + 1 react). Build, lint, check all pass. Existing tests unchanged.
- **Commit**: `53364ab` — fast-forward merged to main.

## Notes

This is the foundation for all future features. Sorting, filtering, and virtualization will all work by updating state and letting subscribers react. The subscribe/getState API is designed to plug directly into React's `useSyncExternalStore` in TASK-008.

Design reference: TanStack Table uses a similar pattern — a core table instance with `getState()` and an `onStateChange` callback. We're choosing an explicit subscribe model instead because it maps more naturally to `useSyncExternalStore`.
