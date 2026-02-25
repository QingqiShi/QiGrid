# TASK-013: Virtualized scroll container (React component + playground)

**Phase:** 2 — Virtualization
**Blocked by:** TASK-011, TASK-012

## Goal

Build the React component that renders a virtualized grid using the core virtualization engine. Update the playground to demonstrate virtualization with 10k+ rows.

## Acceptance criteria

### React (`@qigrid/react`)

- Export a `<VirtualGrid>` component (or equivalent API — could be hooks + render helpers)
- Outer container: `div` with `overflow: auto`, configurable height
- Inner spacer: `div` sized to `totalHeight x totalWidth` for native scrollbars
- Visible rows absolutely positioned using `transform: translateY()` for GPU compositing
- Calls `grid.setScrollTop(scrollTop)` on scroll events
- Only renders rows from `getVisibleRows()` in the DOM
- Column headers are sticky (`position: sticky; top: 0`)
- Cells use column widths from TASK-011
- Accepts grid instance from `useGrid` — does not create its own
- `div`-based layout (not `<table>`) for absolute positioning

### Playground

- Switch from `<table>` to `<VirtualGrid>`
- Increase dataset to 10,000 rows
- Smooth scrolling with 10k rows
- Info bar shows total rows + visible range
- Sorting and filtering (TASK-009/010) still work through the virtualized container

### Tests

- Playwright e2e: scroll to middle, verify correct rows rendered
- Playwright e2e: scroll to bottom, verify last rows rendered
- Existing Playwright tests updated for new layout (or baselines updated)
- React unit test: renders only visible rows, not full dataset

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `cd apps/playground && npx playwright test` passes
