# TASK-027: Cell Selection & Range Selection (Excel-like)

**Priority:** Urgent
**Blocked by:** None (self-contained; absorbs focus management from TASK-019)
**Note:** TASK-019 (Keyboard Navigation) overlaps — its focus/arrow-key scope is subsumed here. After this task, TASK-019 should be updated to cover only remaining keyboard features (PageUp/PageDown, Home/End row-level, Enter/Space action callbacks) that aren't included here.

---

## Goal

Implement Excel-like cell selection in the grid. Users can click, drag, shift-click, and use keyboard shortcuts to select cells and ranges — matching the interaction model developers expect from spreadsheet applications.

---

## Scope

### Phase 1: Focus & Single Cell Selection

**Core types** (`packages/core/src/types.ts` or new `selection.ts`):

```typescript
type CellCoord = { rowIndex: number; columnIndex: number };
type CellRange = { start: CellCoord; end: CellCoord };
type SelectionState = {
  focusedCell: CellCoord | null;
  ranges: CellRange[];        // normalized (start ≤ end)
};
```

**Core pure functions** (new `packages/core/src/selection.ts`):

- `normalizeRange(range: CellRange): CellRange` — ensures start ≤ end on both axes
- `isCellInRange(cell: CellCoord, range: CellRange): boolean`
- `isCellInRanges(cell: CellCoord, ranges: CellRange[]): boolean`
- `rangesEqual(a: CellRange[], b: CellRange[]): boolean` — shallow compare for memoization
- `clampCell(cell: CellCoord, rowCount: number, colCount: number): CellCoord`

**React state** (extend `useGrid` reducer):

- New state fields: `focusedCell`, `selectionRanges`, `selectionAnchor` (internal, not exposed)
- New actions: `FOCUS_CELL`, `SELECT_CELL`, `SELECT_RANGE`, `EXTEND_SELECTION`, `CLEAR_SELECTION`, `SELECT_ALL`
- Expose in `UseGridReturn`: `focusedCell`, `selectedRanges`, selection updater functions

**VirtualGrid changes:**

- `onMouseDown` on cells → set focus + start single-cell selection
- Focused cell gets a distinct CSS class (`vgrid-cell--focused`)
- Selected cells get a CSS class (`vgrid-cell--selected`)
- Pass `isCellSelected(rowIndex, colIndex)` and `isCellFocused(rowIndex, colIndex)` to cell rendering

**Acceptance criteria:**
- [ ] Clicking a cell focuses it (visible indicator: 2px solid border, like Excel)
- [ ] Clicking a cell selects it (light blue background)
- [ ] Clicking another cell moves focus and selection (previous selection cleared)
- [ ] Focus state survives scroll (virtualization-aware: selection is index-based, not DOM-based)
- [ ] `focusedCell` and `selectedRanges` exposed from `useGrid`

### Phase 2: Range Selection via Mouse

**Core additions:**
- `expandRangeToCell(anchor: CellCoord, target: CellCoord): CellRange` — creates range from anchor to target

**Mouse interactions on VirtualGrid:**
- **Click + drag**: `mousedown` sets anchor, `mousemove` expands range from anchor to current cell, `mouseup` finalizes
- **Shift + click**: Extends selection from current anchor to clicked cell (single contiguous range)
- During drag, cells entering/leaving the range update styling in real-time

**Implementation details:**
- Track `isDragging` flag (ref, not state — avoid re-renders during drag)
- Use `pointermove` + `pointerup` on `document` (not just the grid) so dragging outside the grid still works
- Throttle/debounce selection updates during drag to avoid excessive re-renders — but keep visual feedback responsive
- Convert mouse position to cell coordinates using column widths + row height + scroll offset

**Acceptance criteria:**
- [ ] Click and drag selects a rectangular range (highlighted)
- [ ] Range has a visible border around the entire selected rectangle
- [ ] Shift+click extends selection from the anchor cell
- [ ] Dragging outside the grid boundary clamps to edge cells
- [ ] Selection range renders correctly even when partially scrolled out of view (only visible cells are styled, but the range is logically complete)

### Phase 3: Keyboard Selection

**Arrow key navigation (focus movement):**
- `Arrow keys` → move focused cell by one step, clear selection to just the focused cell
- `Tab` → move right (wrap to next row), `Shift+Tab` → move left (wrap to previous row)

**Shift + arrow key selection (range extension):**
- `Shift+Arrow` → extend selection from anchor in arrow direction
- `Shift+Ctrl+Arrow` (or `Shift+Cmd+Arrow` on macOS) → extend selection to edge of data in that direction

**Bulk selection:**
- `Ctrl+A` / `Cmd+A` → select all cells
- `Escape` → clear selection (keep focus)

**Scroll-to-focus:**
- When keyboard navigation moves focus outside the visible viewport, scroll to bring the focused cell into view
- Use `scrollTop` adjustment (vertical) — horizontal scrolling if columns extend beyond viewport

**Acceptance criteria:**
- [ ] Arrow keys move focus cell-by-cell
- [ ] Shift+Arrow extends selection range
- [ ] Ctrl/Cmd+A selects all cells
- [ ] Escape clears selection, focus remains
- [ ] Tab/Shift+Tab navigate cells with row wrapping
- [ ] Focus movement auto-scrolls to keep focused cell visible

### Phase 4: Multi-Range Selection (Ctrl/Cmd + Click)

- `Ctrl+Click` / `Cmd+Click` → add a new single-cell selection without clearing existing ranges
- `Ctrl+Shift+Click` / `Cmd+Shift+Click` → add a new range (from anchor to click target) to existing ranges
- `Ctrl+Click+Drag` → add a new dragged range to existing ranges

**Acceptance criteria:**
- [ ] Ctrl/Cmd+Click adds individual cells to selection
- [ ] Ctrl/Cmd+Click+Drag adds a new range
- [ ] Multiple disjoint ranges can exist simultaneously
- [ ] All selected ranges render with highlight styling
- [ ] Each range has its own visual border

### Phase 5: Clipboard Integration

**Core function:**
- `serializeRangeToTSV(rows: Row<TData>[], columns: Column<TData>[], range: CellRange): string` — extracts cell values as tab-separated text

**Behavior:**
- `Ctrl+C` / `Cmd+C` → copy selected cells to clipboard as TSV (compatible with Excel/Sheets paste)
- Multi-range: concatenate ranges separated by newlines
- Uses `navigator.clipboard.writeText()` (requires secure context)

**Acceptance criteria:**
- [ ] Ctrl/Cmd+C copies selection to clipboard
- [ ] Pasting into Excel/Google Sheets produces correct cell layout
- [ ] Works with single cell, single range, and multi-range selections

---

## Architecture Notes

### Selection state is index-based, not identity-based

Selection stores `{ rowIndex, columnIndex }` — indices into the current `rows` and `columns` arrays. This means:
- Selection is invalidated when sorting/filtering changes the row order → **clear selection on data pipeline changes**
- Selection survives virtualization (indices don't change when rows scroll in/out of view)
- When rows/columns change length, clamp or clear selection

### Selection state lives in useGrid

Extend the existing `GridInternalState` and reducer rather than creating a separate hook. Reasons:
- Selection needs to be cleared when sorting/filtering changes (the reducer already handles those actions)
- `useGrid` already returns the row/column model that selection indexes into
- Keeps a single source of truth

### Rendering performance

- `isCellSelected` check must be fast — called for every visible cell on every render
- For single contiguous range: simple bounds check (O(1))
- For multi-range: check each range (O(n) where n = number of ranges, typically small)
- Avoid creating new objects/arrays in render path — memoize the selection check function

### VirtualGrid rendering approach

Two options for selection visualization:
1. **Per-cell CSS classes** — each cell checks if it's selected/focused and applies classes
2. **Overlay layer** — absolute-positioned div(s) covering the selected range(s)

**Decision: Per-cell CSS classes** for Phase 1-3, with an optional overlay for the range border (the blue outline around the entire selection rectangle). The overlay avoids rendering borders on every cell and gives a cleaner visual.

### Platform detection for modifier keys

- macOS: `Cmd` (metaKey) for multi-select, `Ctrl` for other shortcuts
- Windows/Linux: `Ctrl` (ctrlKey) for both
- Use `event.metaKey || event.ctrlKey` for cross-platform support (same pattern as Excel)

---

## Edge Cases

- Selection with 0 rows or 0 columns → no-op
- Click on header/filter row → should not create cell selection
- Selection during column resize drag → should not interfere (resize takes priority)
- Rapidly switching between mouse and keyboard selection
- Selection after sorting/filtering → clear selection (indices are invalidated)
- Selection with virtualized rows → only visible cells render selection styles, but logical range is preserved
- Auto-scroll during drag when cursor moves beyond grid bounds (stretch goal — can defer)
- Column resize while selection is active → selection stays valid (column indices don't change)

---

## Testing Strategy

**Unit tests (core):**
- `normalizeRange` — various orderings
- `isCellInRange` / `isCellInRanges` — inside, outside, boundary
- `clampCell` — within bounds, clamped
- `serializeRangeToTSV` — single cell, range, multi-range, special characters

**Integration tests (React):**
- Click to select → verify `focusedCell` and `selectedRanges` state
- Click + drag → verify range
- Shift+click → verify extended range
- Ctrl+click → verify multi-range
- Arrow keys → verify focus movement
- Shift+Arrow → verify range extension
- Selection cleared on sort/filter change
- Selection survives scroll (virtualization)

**E2E tests (Playwright):**
- Visual: selected cells have correct styling
- Drag selection across multiple cells
- Keyboard navigation and selection
- Copy to clipboard → paste verification
- Screenshot tests for selection visual states

---

## Files to Create/Modify

**New files:**
- `packages/core/src/selection.ts` — pure selection functions
- `packages/core/src/__tests__/selection.test.ts`

**Modified files:**
- `packages/core/src/types.ts` — add `CellCoord`, `CellRange`, `SelectionState`
- `packages/core/src/index.ts` — export selection functions and types
- `packages/react/src/useGrid.ts` — extend reducer with selection state and actions
- `packages/react/src/VirtualGrid.tsx` — mouse/keyboard handlers, selection rendering
- `packages/react/src/VirtualGrid.css` — selection styles (focused cell border, selected background, range outline)
- `apps/playground/` — update demo to showcase selection features
