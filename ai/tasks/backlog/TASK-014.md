# TASK-014: Column sizing model

**Phase:** 1 — Foundation
**Blocked by:** TASK-013

## Goal

Add width management to the column model so every column has a computed width. This is foundational — virtualization, auto-sizing, and any future resize interaction all depend on it.

## Acceptance criteria

### Core (`@qigrid/core`)

- `ColumnDef<TData>` gains optional sizing props: `width?: number`, `minWidth?: number`, `maxWidth?: number`
- `Column<TData>` exposes computed `width`, `minWidth`, `maxWidth`
- Defaults: `width: 150`, `minWidth: 50`, `maxWidth: Infinity`
- Pure function to resolve column widths: takes column defs + optional runtime overrides, returns columns with effective widths (clamped to min/max)
- Pure function to compute total width from resolved columns

### React (`@qigrid/react`)

- `useGrid` exposes column width state and an updater to change individual column widths
- Width changes are clamped to min/max constraints
- Column model returned from `useGrid` includes effective widths

### Tests

- Default widths (150px when unspecified)
- Explicit widths from ColumnDef
- min/max clamping (value below min → min, value above max → max)
- Width updater clamps and triggers re-render
- Total width sums correctly
- Width overrides reset for removed columns when column defs change

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
