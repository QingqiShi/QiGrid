# TASK-011: Column sizing model

**Phase:** 1 — Foundation
**Blocked by:** none (builds on TASK-007 column model)

## Goal

Add width management to the column model so every column has a computed width. This is foundational — virtualization, auto-sizing, and any future resize interaction all depend on it.

## Acceptance criteria

### Core (`@qigrid/core`)

- `ColumnDef<TData>` gains optional sizing props: `width?: number`, `minWidth?: number`, `maxWidth?: number`
- `Column<TData>` exposes computed `width`, `minWidth`, `maxWidth`
- Defaults: `width: 150`, `minWidth: 50`, `maxWidth: Infinity`
- `GridInstance` exposes `setColumnWidth(columnId: string, width: number)` — clamps to min/max, updates state, notifies subscribers
- `GridInstance` exposes `getTotalWidth(): number` — sum of all column widths
- `GridState` includes `columnWidths: Record<string, number>` for runtime overrides
- `getColumns()` returns columns with their current effective width (def default → runtime override, clamped)
- Column width changes trigger subscriber notifications

### Tests

- Default widths (150px when unspecified)
- Explicit widths from ColumnDef
- min/max clamping (value below min → min, value above max → max)
- `setColumnWidth` updates state and notifies
- `getTotalWidth` sums correctly
- `getColumns()` reflects runtime width overrides
- Width changes after `setColumns()` reset runtime overrides for removed columns

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
