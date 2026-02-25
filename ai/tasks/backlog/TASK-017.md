# TASK-017: Column auto-sizing model

**Phase:** 3 — Core features
**Blocked by:** TASK-011 (needs column width model)

## Goal

Add auto-sizing support to the column model. Core provides the model and callback hooks — actual DOM measurement is done by the consumer or React layer.

## Acceptance criteria

### Core (`@qigrid/core`)

- `ColumnDef<TData>` gains optional `enableAutoSize?: boolean` (default true)
- `GridInstance` exposes `autoSizeColumn(columnId: string, measuredWidth: number)` — sets column width to `max(minWidth, min(maxWidth, measuredWidth))`
- `GridInstance` exposes `autoSizeAllColumns(measurements: Record<string, number>)` — batch auto-size
- Auto-size respects existing min/max constraints from TASK-011

### React (`@qigrid/react`)

- Export a `useColumnAutoSize` hook (or equivalent) that:
  - Accepts the grid instance and a ref to the grid container
  - Measures the rendered width of header text and a sample of cell content
  - Calls `autoSizeColumn` with the measured width
- The hook is opt-in — consumers call it explicitly (e.g., on a button click or on mount)

### Playground

- Add an "Auto-size columns" button that triggers auto-sizing
- Columns resize to fit their content after clicking

### Tests

- `autoSizeColumn` respects min/max clamping
- `autoSizeAllColumns` updates multiple columns in one notification
- Auto-size with `enableAutoSize: false` is a no-op for that column
- React hook measures and applies widths

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
