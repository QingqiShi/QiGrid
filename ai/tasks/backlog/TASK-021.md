# TASK-021: Performance benchmarks + validation

**Phase:** 4 — Polish
**Blocked by:** TASK-015 (needs virtualization to benchmark)

## Goal

Build a comprehensive benchmark suite and validate that the grid meets its performance targets.

## Performance targets

### Bundle size

| Package | Target |
|---|---|
| `@qigrid/core` (all v1 features, minified + gzipped) | ≤ 30kb |

### Core function benchmarks (Vitest bench, median)

| Operation | Dataset | Target |
|---|---|---|
| Sort (single column, strings) | 100k rows | ≤ 40ms |
| Filter (string includes) | 100k rows | ≤ 30ms |
| Group by (single column) | 100k rows | ≤ 60ms |
| Full pipeline (filter + sort + group) | 100k rows | ≤ 100ms |
| Virtual range computation | 1M rows | ≤ 1ms |
| Visible row slicing | 1M rows | ≤ 0.5ms |

### Rendering benchmarks

| Operation | Dataset | Target |
|---|---|---|
| `<VirtualGrid>` mount (via renderHook) | 10k rows | ≤ 100ms |
| Scroll update (re-render after scroll) | 100k rows | ≤ 16ms (one frame) |

### Virtualization validation

- DOM node count stays constant regardless of dataset size (visible rows + overscan only)
- Scrolling 100k rows produces no long tasks (> 50ms) in a Playwright trace

## Acceptance criteria

- All existing bench files updated with the above scenarios
- New bench cases added for grouping, virtualization
- All targets pass
- Bundle size measured and reported
- Playwright test: load 100k rows, verify smooth scroll (no blank regions)
- If any target is missed, document it with analysis and create a follow-up task

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `pnpm turbo bench` passes all timing thresholds
