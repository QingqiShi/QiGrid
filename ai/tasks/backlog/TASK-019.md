# TASK-019: Performance benchmarks + validation

**Phase:** 4 — Polish
**Blocked by:** TASK-013 (needs virtualization to benchmark)

## Goal

Build a comprehensive benchmark suite and validate that the grid meets its performance targets. Define CI-enforceable thresholds.

## Performance targets

### Bundle size

| Package | Target |
|---|---|
| `@qigrid/core` (all v1 features, minified + gzipped) | ≤30kb |

### Core engine benchmarks (Vitest bench, median)

| Operation | Dataset | Target |
|---|---|---|
| `createGrid` (no sort/filter) | 100k rows | ≤50ms |
| Sort toggle (single column, strings) | 100k rows | ≤40ms |
| Filter change (string includes) | 100k rows | ≤30ms |
| Group by (single column) | 100k rows | ≤60ms |
| `setScrollTop` (virtual range recalc) | 1M rows | ≤1ms |
| `getVisibleRows` | 1M rows | ≤0.5ms |

### Rendering benchmarks

| Operation | Dataset | Target |
|---|---|---|
| `<VirtualGrid>` mount (via renderHook) | 10k rows | ≤100ms |
| Scroll update (setScrollTop + re-render) | 100k rows | ≤16ms (one frame) |

### Virtualization validation

- DOM node count stays constant regardless of dataset size (visible rows + overscan only)
- Scrolling 100k rows produces no long tasks (>50ms) in a Playwright trace

## Acceptance criteria

- All existing bench files updated with the above scenarios
- New bench cases added for grouping, virtualization
- All targets pass on CI
- Bundle size measured and reported (add to build output or a separate script)
- Playwright test: load 100k rows, verify smooth scroll (no blank regions)
- If any target is missed, document it in this task file with analysis and create a follow-up task

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm turbo bench` passes all timing thresholds
