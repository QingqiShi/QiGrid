# TASK-030: Pinned rows (top + bottom)

**Phase:** 3 — Core features
**Blocked by:** TASK-017 (grouping — pinned rows must integrate with the full pipeline including grouping)

## Goal

Allow rows to be pinned to the top or bottom of the grid. Pinned rows fully participate in the pipeline (filtering, sorting, grouping) but are visually separated from the scrollable body — pinned-top rows render above the virtual scroll area, pinned-bottom rows render below it.

## Design

### Configuration

Pinning is identified by predicate functions on the source data:

```typescript
interface UseGridOptions<TData> {
  // ... existing
  pinnedTopPredicate?: (row: TData, index: number) => boolean;
  pinnedBottomPredicate?: (row: TData, index: number) => boolean;
}
```

Core equivalents for the stateless functions:

```typescript
function partitionPinnedRows<TData>(
  rows: GridRow<TData>[],
  data: TData[],
  pinnedTopPredicate?: (row: TData, index: number) => boolean,
  pinnedBottomPredicate?: (row: TData, index: number) => boolean,
): PinnedPartition<TData>;

interface PinnedPartition<TData> {
  pinnedTop: GridRow<TData>[];
  body: GridRow<TData>[];
  pinnedBottom: GridRow<TData>[];
}
```

### Pipeline integration

Pinned rows go through the full pipeline — they are filtered, sorted, and grouped like any other row. After the pipeline produces the final `GridRow<TData>[]`, a partition step splits them into three sections:

```
data → filter → wrap → sort → group → flatten → partition(pinned) → virtualize(body only)
```

- `pinnedTop` rows are rendered in a fixed (non-virtualized) section above the scroll container
- `pinnedBottom` rows are rendered in a fixed section below the scroll container
- `body` rows are virtualized as before

### Grouping interaction

When grouping is active, pinned predicates are evaluated against the original leaf data. If a row that matches a pinned predicate ends up inside a group:

- The leaf row is extracted from its group and placed in the pinned section
- The group still exists in the body (with one fewer leaf)
- If all leaves of a group are pinned, the group row is removed from the body
- Group rows themselves are never pinned (only leaf rows)

### Rendering

`VirtualGrid` gains three render sections:

```
┌─────────────────────────┐
│   Pinned Top Rows       │  ← fixed, not virtualized
├─────────────────────────┤
│                         │
│   Scrollable Body       │  ← virtualized as before
│                         │
├─────────────────────────┤
│   Pinned Bottom Rows    │  ← fixed, not virtualized
└─────────────────────────┘
```

Pinned rows use the same `renderRow` callback as body rows. They are visually distinguished by a CSS class (`.vgrid-pinned-top`, `.vgrid-pinned-bottom`) that consumers can style.

## Acceptance criteria

### Core (`@qigrid/core`)

- `partitionPinnedRows` pure function exported
- `PinnedPartition<TData>` type exported
- Partition correctly splits `GridRow<TData>[]` into top, body, bottom
- Works with `LeafRow` and `GroupRow` discriminated union
- When no predicates provided, all rows go to `body` (no-op)
- When grouping is active, pinned leaf rows are extracted from groups
- Empty groups (all leaves pinned) are removed from body

### React (`@qigrid/react`)

- `useGrid` accepts `pinnedTopPredicate` and `pinnedBottomPredicate`
- `UseGridReturn` gains:
  - `pinnedTopRows: GridRow<TData>[]`
  - `pinnedBottomRows: GridRow<TData>[]`
  - `rows` continues to return body rows only (virtualized)
- Partition is memoized — recomputes only when rows or predicates change

### VirtualGrid

- Renders pinned-top rows in a fixed container above the scroll area
- Renders pinned-bottom rows in a fixed container below the scroll area
- Pinned rows are not virtualized (rendered always)
- Pinned row containers have `.vgrid-pinned-top` and `.vgrid-pinned-bottom` classes
- Pinned rows use the same `renderRow` / column layout as body rows
- Scroll area height accounts for pinned row heights

### Edge cases

- No pinned predicates — behaves exactly as before (zero overhead)
- A row matches both top and bottom predicates — top wins
- All rows pinned to top — body is empty, no scroll area
- All rows pinned to bottom — body is empty, no scroll area
- Pinned predicate + filtering — filtered-out rows are not pinned
- Pinned predicate + sorting — pinned rows maintain sorted order within their section
- Pinned predicate + grouping — pinned leaves extracted from groups, empty groups removed
- Large number of pinned rows — still renders correctly (not virtualized, so keep count reasonable; document this)

### Playground

- Add a pin column or checkbox to demonstrate pinning
- Show rows pinned to top and bottom
- Demonstrate pinned rows surviving filter/sort changes

### Tests

**Core (partitionPinnedRows):**
- No predicates → all rows in body
- Top predicate → matching rows in pinnedTop, rest in body
- Bottom predicate → matching rows in pinnedBottom, rest in body
- Both predicates → correct three-way split
- Top wins when row matches both predicates
- With grouping: pinned leaves extracted from groups
- With grouping: empty groups removed from body
- With filtering: filtered rows not pinned
- Order preserved within each partition

**React:**
- useGrid returns pinnedTopRows, pinnedBottomRows, rows (body)
- Changing predicate re-partitions correctly
- Memoization: same predicates + same data → same references

**VirtualGrid:**
- Pinned sections render with correct CSS classes
- Body virtualization unaffected by pinned rows
- Scroll height correct (excludes pinned row heights)

### Quality gate

- `pnpm build && pnpm lint && pnpm check && pnpm test` all pass
- `pnpm --filter @qigrid/playground e2e` passes
