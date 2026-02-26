# TASK-028: Arrow keys after drag selection should navigate from anchor cell

**Priority:** Bug fix
**Blocked by:** None (TASK-027 already complete)

## Bug

After drag-selecting a range of cells, pressing arrow keys moves focus from the **end cell** (where the drag finished) instead of the **anchor cell** (where the drag started). Excel moves from the anchor cell — the cell where the user initiated the drag — and visually distinguishes it from the rest of the selection.

### Expected behavior (matches Excel)

1. User clicks cell B2 and drags to D5, creating a range selection.
2. B2 is the **anchor cell**. It should be visually distinct within the selection (e.g., white/unshaded background while the rest of the range is highlighted blue).
3. User presses the Down arrow key.
4. Selection clears and focus moves to **B3** (one cell below the anchor B2), not D6 (one cell below the drag end D5).

### Actual behavior

- The anchor cell is not visually distinguished from other selected cells.
- Arrow key navigation after a drag selection moves from the end cell (D5 in the example above), not the anchor cell.

## Scope

### Visual anchor indicator

- The anchor cell within a selection range should have a visually distinct style (e.g., white/unshaded background) to differentiate it from the rest of the highlighted selection, matching the Excel convention.

### Keyboard navigation from anchor

- When arrow keys are pressed after a range selection (without Shift held), the new focused cell should be calculated relative to the **anchor cell**, not the end cell.
- This applies to all methods that produce a range: click-drag, Shift+click, and Shift+arrow.

### Tests

- Unit test: after setting a range with anchor at (1,1) and end at (3,3), simulating arrow-down produces focus at (2,1).
- E2E test: drag-select a range, press arrow key, verify focus lands adjacent to the starting cell.
- Visual: anchor cell renders with distinct styling within a selection.

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm --filter @qigrid/playground e2e` passes
