# TASK-012: Row virtualization engine

**Phase:** 1 — Foundation
**Blocked by:** none (independent of column sizing)

## Goal

Implement the math and state management for row virtualization in core. Given a scroll position, container height, and row height, compute which rows are visible. No DOM/React code — pure computation.

## Acceptance criteria

### Core (`@qigrid/core`)

- `GridOptions` accepts optional `virtualization?: { rowHeight: number; containerHeight: number; overscan?: number }`
- When virtualization is configured, `GridState` includes `virtualRange: { startIndex: number; endIndex: number; totalHeight: number; offsetTop: number }`
- `GridInstance` exposes `setScrollTop(scrollTop: number)` — computes new visible range and notifies subscribers
- `GridInstance` exposes `getVisibleRows(): Row<TData>[]` — returns only rows in the virtual window (visible + overscan)
- `getRows()` continues to return ALL processed rows (filter → sort) regardless of virtualization
- Pipeline: filter → sort → (virtualize window) → return
- Default overscan: 5 rows above and below
- `totalHeight = processedRowCount * rowHeight`
- `offsetTop` = pixel offset for the first visible row (used for absolute positioning)

### Edge cases

- Scroll to exact top (scrollTop = 0)
- Scroll to exact bottom (scrollTop = totalHeight - containerHeight)
- Data smaller than container (all rows visible, no scroll needed)
- Empty data (zero rows)
- Data change resets scroll position to 0
- Filter/sort change recalculates virtual range at current scroll position
- Overscan doesn't extend beyond data bounds (no negative indices, no index > rowCount)

### Performance

- Add bench case: `setScrollTop` on 1M rows completes in ≤1ms median

### Tests

- Virtual range at top, middle, bottom of dataset
- Overscan boundaries (correct number of extra rows, clamped at edges)
- Scroll position updates trigger subscriber notification
- Data change resets virtual range
- Filter/sort change updates virtual range
- Empty data returns empty visible rows
- Container larger than data returns all rows
- `getVisibleRows` vs `getRows` return different results when virtualized

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
