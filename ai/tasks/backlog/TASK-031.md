# TASK-031: Pinned (frozen) columns — left + right

**Phase:** 3 — Core features
**Blocked by:** TASK-019 (keyboard navigation — pinned columns must integrate with cell focus traversal)

## Goal

Allow columns to be pinned to the left or right edge of the grid. Pinned columns stay fixed while the unpinned columns scroll horizontally. Implemented via CSS `position: sticky` — no separate render sections, no column virtualization required.

## Design

### Configuration

Pinning is declared on `ColumnDef`:

```typescript
export interface ColumnDef<TData> {
  // ... existing
  pin?: "left" | "right";
}
```

The resolved `Column<TData>` carries the same field:

```typescript
export interface Column<TData> {
  // ... existing
  pin: "left" | "right" | undefined;
}
```

### Column ordering

`buildColumnModel` (or a new downstream utility) produces a display-order column array:

```
[...pinnedLeft, ...unpinned, ...pinnedRight]
```

Within each group, the original definition order is preserved. This ordering is used for both header and body cell rendering.

### Core function

A pure function computes the sticky offsets for each column:

```typescript
interface ColumnPinMeta {
  pin: "left" | "right" | undefined;
  stickyOffset: number;    // px offset from the pinned edge
  isLastPinLeft: boolean;  // true for the rightmost left-pinned column (for border styling)
  isFirstPinRight: boolean; // true for the leftmost right-pinned column (for border styling)
}

function computePinOffsets<TData>(columns: Column<TData>[]): ColumnPinMeta[];
```

- Left-pinned columns: `stickyOffset` is the cumulative width of preceding left-pinned columns (first = 0, second = width of first, etc.)
- Right-pinned columns: `stickyOffset` is the cumulative width of following right-pinned columns (last = 0, second-to-last = width of last, etc.)
- Unpinned columns: `pin` is undefined, offset is irrelevant

### Rendering

Each pinned cell (header + body) gets:

```css
position: sticky;
left: <stickyOffset>px;   /* for left-pinned */
right: <stickyOffset>px;  /* for right-pinned */
z-index: 1;               /* above scrolling cells */
```

The header row already has `z-index: 2` with `position: sticky; top: 0`. Pinned header cells need `z-index: 3` so they stay above both the scrolling header cells and the pinned body cells.

CSS classes for consumer styling:

- `.vgrid-cell-pinned-left` — left-pinned cells
- `.vgrid-cell-pinned-right` — right-pinned cells
- `.vgrid-cell-pinned-last-left` — rightmost left-pinned cell (border/shadow edge)
- `.vgrid-cell-pinned-first-right` — leftmost right-pinned cell (border/shadow edge)

### Keyboard navigation integration

Arrow-key traversal must follow the display column order (pinned-left → unpinned → pinned-right). The existing focus model uses column indices — after reordering, the index-to-column mapping updates and navigation works naturally.

### Group column interaction

Auto-generated group columns (from `buildGroupColumns`) are not pinnable — they are always unpinned and appear in the unpinned section. If the user's `ColumnDef` for a column that's being grouped has `pin` set, the pin is only applied when the column is not currently used for grouping.

## Acceptance criteria

### Core (`@qigrid/core`)

- `ColumnDef<TData>` gains optional `pin?: "left" | "right"`
- `Column<TData>` carries resolved `pin` field
- `computePinOffsets` pure function exported
- `ColumnPinMeta` type exported
- Display-order utility reorders columns: left-pinned → unpinned → right-pinned
- Offset calculation is correct for multi-column pinning on both sides
- `isLastPinLeft` and `isFirstPinRight` flags set correctly

### React (`@qigrid/react`)

- `useGrid` computes and memoizes pin metadata alongside the column model
- `UseGridReturn` exposes pin metadata (or columns carry it directly)
- Pin metadata recomputes only when columns or widths change
- Column resize updates sticky offsets correctly

### VirtualGrid

- Pinned cells render with `position: sticky` and correct `left`/`right` offsets
- Pinned cells have appropriate z-index layering (body pinned > body unpinned, header pinned > header unpinned + body pinned)
- CSS classes applied: `.vgrid-cell-pinned-left`, `.vgrid-cell-pinned-right`, `.vgrid-cell-pinned-last-left`, `.vgrid-cell-pinned-first-right`
- Header cells and body cells share the same sticky behavior
- Horizontal scrolling works — unpinned columns scroll while pinned columns stay fixed

### Edge cases

- No pinned columns — zero overhead, no sticky styles applied
- All columns pinned left — no horizontal scroll needed, grid behaves normally
- All columns pinned right — same as above
- Single column pinned — offset is 0
- Column resize while pinned — offsets update reactively
- Pinned column + grouping — group columns appear unpinned between pinned-left and pinned-right
- Keyboard navigation — arrow keys traverse in display order across pinned boundaries
- Filter row cells — pinned filter cells also sticky

### Playground

- Mark 1-2 columns as `pin: "left"` and 1 as `pin: "right"` in the demo
- Show horizontal scroll with pinned columns staying fixed
- Add a subtle border/shadow on pinned edges via the CSS classes

### Tests

**Core (computePinOffsets):**
- No pinned columns → all offsets undefined/zero
- Left-pinned columns → correct cumulative left offsets
- Right-pinned columns → correct cumulative right offsets
- Mixed left + right → correct offsets for both sides
- `isLastPinLeft` and `isFirstPinRight` flags correct
- Column width changes → offsets recalculated

**React:**
- Pin metadata memoized with column model
- Column resize triggers offset recalculation
- Display order: left-pinned → unpinned → right-pinned

**VirtualGrid:**
- Pinned cells have sticky positioning
- CSS classes applied correctly
- Horizontal scroll leaves pinned columns fixed
- Header pinned cells layer above body pinned cells

### Quality gate

- `pnpm build && pnpm lint && pnpm check && pnpm test` all pass
- `pnpm --filter @qigrid/playground e2e` passes
