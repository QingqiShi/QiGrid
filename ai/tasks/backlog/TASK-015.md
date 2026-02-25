# TASK-015: Virtualized scroll container (React component + playground)

**Phase:** 2 — Virtualization
**Blocked by:** TASK-013, TASK-014

## Goal

Build the React component that renders a virtualized grid using core's pure virtualization functions. Update the playground to demonstrate virtualization with 10k+ rows.

## Acceptance criteria

### React (`@qigrid/react`)

- Export a `<VirtualGrid>` component (or equivalent API — could be hooks + render helpers)
- Outer container: scrollable div with configurable height
- Inner spacer sized to `totalHeight x totalWidth` for native scrollbars
- Visible rows absolutely positioned using CSS transforms for GPU compositing
- On scroll, recomputes virtual range using core's pure function and re-renders
- Only renders rows returned by the visible row slice
- Column headers are sticky
- Cells use column widths from TASK-013
- Accepts data from `useGrid` — does not manage its own grid state

### Playground

- Switch from `<table>` to `<VirtualGrid>`
- Increase dataset to 10,000 rows
- Smooth scrolling with 10k rows
- Info bar shows total rows + visible range
- Sorting and filtering still work through the virtualized container

### Tests

- Playwright e2e: scroll to middle, verify correct rows rendered
- Playwright e2e: scroll to bottom, verify last rows rendered
- Existing Playwright tests updated for new layout (or baselines updated)
- React unit test: renders only visible rows, not full dataset

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `cd apps/playground && npx playwright test` passes
