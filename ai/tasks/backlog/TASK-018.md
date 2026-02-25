# TASK-018: Keyboard navigation

**Phase:** 3 — Core features
**Blocked by:** TASK-015 (needs virtualization awareness for PageUp/PageDown)

## Goal

Implement cell-level keyboard navigation. Users can move focus between cells using arrow keys. Works with virtualization (focus moves can trigger scroll).

## Acceptance criteria

### Core (`@qigrid/core`)

- Pure function to compute next focus position: takes current cell, direction, grid bounds, page size → returns new cell position
- Directions: up, down, left, right
- Home/End: first/last column in current row
- PageUp/PageDown: move by page size (containerHeight / rowHeight rows)
- Clamps at grid boundaries (doesn't wrap)

### React (`@qigrid/react`)

- Focused cell state managed by `useGrid` or a companion hook
- Grid container is focusable (`tabIndex={0}`) and captures keyboard events
- Arrow keys, Home, End, PageUp, PageDown handled via `onKeyDown`
- When focus moves beyond the visible virtual range, scroll to bring the focused cell into view
- Focused cell rendered with a visual indicator (e.g., outline/border)
- Enter/Space on a focused cell fires an optional `onCellAction` callback

### Playground

- Click a cell to focus it
- Arrow keys move between cells
- Focused cell has visible highlight
- PageUp/PageDown scrolls and moves focus

### Tests

- Arrow key movement in all 4 directions
- Boundary clamping (can't move past edges)
- Home/End within row
- PageUp/PageDown moves by page size
- Virtualized: focus beyond viewport scrolls to reveal cell

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
