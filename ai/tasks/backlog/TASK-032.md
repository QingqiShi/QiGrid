# TASK-032: Single-click replaces sort; modifier-click adds multi-column sort

**Phase:** 3 — Core features
**Blocked by:** None

## Goal

Change column sorting UX so that a plain click replaces the current sort with the clicked column (single-column sort), while holding a modifier key (Ctrl/Cmd/Shift) adds the column to a multi-column sort. When multiple columns are sorted, display a numeric rank indicator next to each sort arrow so users can see sort priority.

## Current behavior (broken)

Every click calls `cycleSort`, which appends to the sorting array. Clicking column A, then B, then C produces a three-column sort — unintuitive for most users who expect clicking a new column to replace the previous sort.

## Design

### Core changes

**`cycleSort` gains a `multi` parameter:**

```typescript
function cycleSort(
  current: SortingState,
  columnId: string,
  multi?: boolean,
): SortingState;
```

- `multi: false` (default): Clear all other columns, then cycle the clicked column (none → asc → desc → none).
- `multi: true`: Preserve existing sorts, cycle the clicked column within the array (existing `cycleSort` behavior).

When `multi` is false and the column is not currently sorted, the result is `[{ columnId, direction: "asc" }]`. When the column is already the only sorted column, it cycles normally (asc → desc → none). When the column is already part of a multi-sort, switching to single mode clears the others and keeps the clicked column cycling from its current direction.

### React changes

**`gridReducer` — `TOGGLE_SORT` action gains `multi` field:**

```typescript
{ type: "TOGGLE_SORT"; columnId: string; multi?: boolean }
```

The reducer passes `multi` through to `cycleSort`.

**`useGrid` — `toggleSort` signature change:**

```typescript
toggleSort: (columnId: string, multi?: boolean) => void;
```

Consumers pass the modifier key state from the click event.

### Playground changes

**Header click handler detects modifier keys:**

```typescript
onClick={(e) => toggleSort(column.id, e.ctrlKey || e.metaKey || e.shiftKey)}
```

**Sort indicator shows rank number for multi-column sorts:**

When `sorting.length > 1`, display the 1-based position in the sort array next to the arrow. For example: `↑1`, `↓2`. When only one column is sorted, show the arrow alone (no number).

Update `getSortIndicator` in the playground to accept the full `SortingState` and compute the rank:

```typescript
function getSortIndicator(sorting: SortingState, columnId: string): string {
  const index = sorting.findIndex((s) => s.columnId === columnId);
  if (index === -1) return "";
  const arrow = sorting[index].direction === "asc" ? "↑" : "↓";
  return sorting.length > 1 ? ` ${arrow}${index + 1}` : ` ${arrow}`;
}
```

### Benchmark harness

The benchmark harness (`packages/benchmark/harness/App.tsx`) also renders sort headers. Update its click handler and sort indicator to match.

## Acceptance criteria

### Core (`@qigrid/core`)

- `cycleSort(current, columnId)` (no `multi`) replaces all sorts with the clicked column
- `cycleSort(current, columnId, true)` preserves existing sorts (old behavior)
- `cycleSort(current, columnId, false)` explicitly single-column mode
- Single-column cycle: none → asc → desc → none
- Multi-column cycle: none → append asc → flip to desc → remove (unchanged from current)
- When single-clicking a column that's already in a multi-sort, clear others and keep that column at its current direction, then cycle from there on next click

### React (`@qigrid/react`)

- `TOGGLE_SORT` action accepts optional `multi` field
- `toggleSort` callback accepts optional `multi` parameter
- Default behavior (no `multi` argument) is single-column sort

### Playground

- Plain click on a column header sorts by that column only (replacing any prior sort)
- Ctrl+click / Cmd+click / Shift+click adds the column to multi-sort
- When multiple columns are sorted, each header shows its rank number (e.g., `↑1`, `↓2`)
- When only one column is sorted, no rank number is shown

### Benchmark harness

- Harness header click handler updated to match playground behavior
- Existing benchmarks continue to work (sort benchmark uses `window.__GRID_API__.toggleSort`)

### Tests

**Core (`cycleSort`):**
- Single mode: clicking unsorted column → `[{ columnId, direction: "asc" }]`
- Single mode: clicking asc column → `[{ columnId, direction: "desc" }]`
- Single mode: clicking desc column → `[]`
- Single mode: clicking new column when another is sorted → replaces with new column asc
- Multi mode: clicking new column when another is sorted → appends new column
- Multi mode: full cycle (asc → desc → remove) with other sorts preserved
- Default (no `multi` arg) behaves as single mode

**React:**
- `toggleSort(colId)` produces single-column sort
- `toggleSort(colId, true)` produces multi-column sort
- Dispatch `TOGGLE_SORT` with and without `multi`

### Edge cases

- Sorting state that was `[]` behaves identically for single and multi mode (both add asc)
- Clicking the only sorted column in single mode cycles it (doesn't get stuck)
- `setSorting` is unaffected — direct state replacement still works
- Group-by still works with the new sorting behavior

### Quality gate

- `pnpm build && pnpm lint && pnpm check && pnpm test` all pass
- `pnpm --filter @qigrid/playground e2e` passes
