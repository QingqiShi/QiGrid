# TASK-016: Keyboard navigation

**Phase:** 3 — Core features
**Blocked by:** TASK-013 (needs virtualization awareness for PageUp/PageDown)

## Goal

Implement cell-level keyboard navigation. Users can move focus between cells using arrow keys. Works with virtualization (focus moves can trigger scroll).

## Acceptance criteria

### Core (`@qigrid/core`)

- `GridState` includes `focusedCell: { rowIndex: number; columnIndex: number } | null`
- `GridInstance` exposes `setFocusedCell(rowIndex: number, columnIndex: number)` and `moveFocus(direction: 'up' | 'down' | 'left' | 'right')`
- `moveFocus` clamps at grid boundaries (doesn't wrap)
- Home/End: move to first/last column in current row
- PageUp/PageDown: move by `Math.floor(containerHeight / rowHeight)` rows (virtualization-aware)
- Focus changes trigger subscriber notification
- When virtualized, moving focus beyond visible range triggers `setScrollTop` to bring focused cell into view

### React (`@qigrid/react`)

- `<VirtualGrid>` (or equivalent) renders focused cell with a visual indicator (e.g., outline/border)
- Grid container is focusable (`tabIndex={0}`) and captures keyboard events
- Arrow keys, Home, End, PageUp, PageDown handled via `onKeyDown`
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
- Focus change triggers notification
- Virtualized: focus beyond viewport scrolls to reveal cell

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
