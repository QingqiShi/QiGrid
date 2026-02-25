# TASK-015: Row virtualization engine

**Phase:** 1 — Foundation
**Blocked by:** TASK-013

## Goal

Implement the math for row virtualization as a pure function in core. Given a scroll position, container height, and row height, compute which rows are visible. No DOM/React code — pure computation.

## Acceptance criteria

### Core (`@qigrid/core`)

- Pure function that computes a virtual range: takes total row count, scroll position, container height, row height, and overscan count — returns `{ startIndex, endIndex, totalHeight, offsetTop }`
- Pure function to slice rows by virtual range: takes full row array + range, returns visible rows
- Default overscan: 5 rows above and below
- `totalHeight = totalRowCount * rowHeight`
- `offsetTop` = pixel offset for the first visible row (for absolute positioning)

### Edge cases

- Scroll to exact top (scrollTop = 0)
- Scroll to exact bottom (scrollTop = totalHeight - containerHeight)
- Data smaller than container (all rows visible, no scroll needed)
- Empty data (zero rows)
- Overscan doesn't extend beyond data bounds (no negative indices, no index > rowCount)

### Performance

- Virtual range computation on 1M rows completes in ≤ 1ms median (Vitest bench)
- Visible row slicing on 1M rows completes in ≤ 0.5ms median (Vitest bench)
- Add these as bench cases in this task — don't defer to TASK-024

### Tests

- Virtual range at top, middle, bottom of dataset
- Overscan boundaries (correct number of extra rows, clamped at edges)
- Empty data returns empty range
- Container larger than data returns full range
- Row slicing returns correct subset

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
