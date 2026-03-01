# TASK-033: Optimize sortRows for 100k string sort target (≤ 40ms)

**Phase:** 4 — Polish
**Blocked by:** none

## Context

TASK-024 benchmarking revealed that `sortRows` on 100k rows with a string column takes ~41-55ms (varies by run), exceeding the original 40ms target. The threshold was raised to 60ms to unblock the benchmark suite, but the original 40ms aspiration remains.

## Analysis

- `defaultComparator` uses simple `<`/`>` string comparison (not `localeCompare`), which is already the fastest JS approach
- JS's `Array.prototype.sort` is the bottleneck — it's O(n log n) and the comparison involves repeated `getValue()` calls and Map lookups
- Potential optimizations:
  1. **Pre-extract sort keys** — call `getValue()` once per row before sorting, store in a parallel array, sort by index
  2. **Schwartzian transform** — decorate-sort-undecorate pattern to avoid repeated accessor calls
  3. **Cache column lookups** — the `columnMap.get(columnId)` call is inside the comparator hot path

## Acceptance criteria

- `sortRows 100k / by string column` benchmark mean ≤ 40ms
- Update threshold in `reporter.ts` back to 40ms
- No API changes — optimization is internal to `sortRows`

### Quality gate

- `pnpm build && pnpm lint && pnpm check && pnpm test` all pass
- `pnpm --filter @qigrid/core bench` passes with 40ms threshold
