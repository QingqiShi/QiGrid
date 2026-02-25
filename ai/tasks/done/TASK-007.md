# TASK-007: Column model with getValue

- **Assignee:** —
- **Blocked by:** TASK-006

## Acceptance criteria

- Each column definition (`ColumnDef<TData>`) is processed into a runtime `Column<TData>` object during grid creation
- `Column<TData>` has a `getValue(row: TData): unknown` method that resolves the cell value using `accessorKey` or `accessorFn` (falling back to `undefined` if neither is set)
- The grid instance exposes `getColumns(): Column<TData>[]` returning the processed column objects
- `Column<TData>` also carries forward all original `ColumnDef` properties (`id`, `header`, `accessorKey`, `accessorFn`)
- The row model's `Row<TData>` gains a `getValue(columnId: string): unknown` method that delegates to the column's `getValue`
- Cell value resolution logic is fully in `@qigrid/core` — consumers no longer need to manually resolve `accessorKey`/`accessorFn`
- Unit tests cover: `getValue` via `accessorKey`, `getValue` via `accessorFn`, `getValue` when neither is set, `Row.getValue(columnId)` delegation
- All existing tests still pass (backward compatible or migrated)
- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass

## Implementation notes

- **`packages/core/src/types.ts`** — Added `Column<TData>` interface with `id`, `accessorKey`, `accessorFn`, `header`, and `getValue(row: TData): unknown`. Added `getValue(columnId: string): unknown` to `Row<TData>`. Added `getColumns(): Column<TData>[]` to `GridInstance<TData>`.
- **`packages/core/src/createGrid.ts`** — `buildColumn()` converts `ColumnDef` to `Column` with `getValue` that resolves via `accessorKey` (preferred) > `accessorFn` > `undefined`. `buildColumnModel()` maps defs to columns. Mutable `columnMap` closure enables `Row.getValue(columnId)` delegation without row model rebuild on column changes. `buildRowModel` now creates rows with `getValue` method that captures `resolveColumn` closure. `setColumns` and `setState` rebuild column model and map.
- **Key design**: `Row.getValue` captures a `resolveColumn` closure reading from the mutable `columnMap`. This means `setColumns` only rebuilds the column model — not the row model array. Existing rows automatically pick up new columns. Preserves the TASK-006 invariant that `setColumns` doesn't change row model reference.
- **`packages/core/src/__tests__/columnModel.test.ts`** — 11 new tests covering `getColumns()`, `Column.getValue` (accessorKey, accessorFn, neither, priority), `Row.getValue` delegation (basic, accessorFn, unknown column, column change reflection), column model rebuild on `setColumns`.
- **Existing test updates** — `toEqual` assertions on Row objects in `createGrid.test.ts` and `reactiveState.test.ts` changed to property-level assertions (Row now has `getValue` method).
- **Minor fix** — Fixed pre-existing Biome formatting issue in `apps/playground/src/grid.css`.
- **Exports** — `Column` type exported from `@qigrid/core` and re-exported from `@qigrid/react`.
- **Verification on main**: 41 tests pass (33 core + 8 react). Build, lint, check all pass.

## Notes

This unblocks the playground from doing manual cell value resolution (the `col.accessorKey != null ? row.original[col.accessorKey] : col.accessorFn ? ...` pattern in App.tsx). It also provides the foundation for sorting and filtering, which need to access cell values generically.
