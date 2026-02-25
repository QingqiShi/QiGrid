# TASK-019: Column auto-sizing model

**Phase:** 3 — Core features
**Blocked by:** TASK-013 (needs column width model)

## Goal

Add auto-sizing support to the column model. Core provides a pure clamping function. Actual DOM measurement is done by the consumer or React layer.

## Acceptance criteria

### Core (`@qigrid/core`)

- `ColumnDef<TData>` gains optional `enableAutoSize?: boolean` (default true)
- Pure function to compute auto-sized width: takes measured width + min/max constraints → returns clamped width
- Batch variant: takes a map of columnId → measured width, returns a map of columnId → clamped width

### React (`@qigrid/react`)

- Export a `useColumnAutoSize` hook that:
  - Accepts the grid data/columns and a ref to the grid container
  - Measures the rendered width of header text and a sample of cell content
  - Returns auto-sized widths that can be fed into the column width state
- The hook is opt-in — consumers call it explicitly (e.g., on a button click or on mount)

### Playground

- Add an "Auto-size columns" button that triggers auto-sizing
- Columns resize to fit their content after clicking

### Tests

- Clamping respects min/max
- Batch auto-size handles multiple columns
- Auto-size with `enableAutoSize: false` is a no-op for that column
- React hook measures and applies widths

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
