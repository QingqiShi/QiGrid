# TASK-026: Interactive column resizing

**Phase:** 3 — Core features
**Blocked by:** TASK-016 (needs virtualized grid container with column-width-based layout)

## Goal

Allow users to drag column borders to resize columns. The resize interaction feeds into the column width model from TASK-014 via `setColumnWidth`.

## Acceptance criteria

### React (`@qigrid/react`)

- Export a `useColumnResize` hook (or integrate into `<VirtualGrid>`)
- Drag handle appears on the right edge of each column header
- Dragging updates column width in real time via `setColumnWidth`
- Width is clamped to the column's `minWidth`/`maxWidth` constraints
- Cursor changes to `col-resize` on hover and during drag
- Drag works correctly even when the mouse moves outside the header area (use pointer capture)
- Double-click on the drag handle triggers auto-size for that column (if TASK-020 is done; otherwise skip this)

### Playground

- Column resizing works in the demo grid
- Resizing is visually smooth — no layout thrashing or flicker

### Tests

- Playwright e2e: drag a column border, verify the column width changes
- Playwright e2e: drag below minWidth, verify it stops at minWidth
- Playwright e2e: verify cursor changes during resize
- React unit test: hook produces correct width updates during a simulated drag sequence

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm --filter @qigrid/playground e2e` passes
