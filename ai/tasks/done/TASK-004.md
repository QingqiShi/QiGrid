# TASK-004: Performance testing scaffold

- **Assignee:** —
- **Blocked by:** TASK-002, TASK-003

## Acceptance criteria

- Vitest bench files in `packages/core/` measuring: grid instance creation, sorting 100k rows, filtering 100k rows
- react-component-benchmark tests in `packages/react/` measuring mount and update times
- `pnpm turbo bench` runs and outputs timing results locally

## Implementation notes

- **`packages/core/src/__bench__/grid.bench.ts`** — Core benchmarks using Vitest bench:
  - Grid instance creation at 100, 10k, and 100k rows
  - `getRows()` materialization at 100, 10k, and 100k rows
  - Sorting 100k rows (string column via localeCompare, numeric column)
  - Filtering 100k rows (string equality, numeric range, string includes)
  - Sort/filter benchmarks operate on `getRows()` output since core sorting/filtering APIs don't exist yet — comments note these should be replaced with `grid.sort()`/`grid.filter()` once available.

- **`packages/react/src/__bench__/useGrid.bench.ts`** — React benchmarks using Vitest bench + `@testing-library/react` `renderHook`:
  - `useGrid` mount at 100, 1k, and 10k rows
  - `useGrid` rerender with new data at 1k and 10k rows
  - Uses `renderHook` instead of `react-component-benchmark` because `react-component-benchmark` v2.0.0 has `peerDependencies: { react: "^18" }` incompatible with React 19.

- **Config changes**: `turbo.json` (`bench` task, `cache: false`), root + core + react `package.json` (`bench` script → `vitest bench`), core + react `vitest.config.ts` (`benchmark.include` pattern for `*.bench.ts`).

- **Verified on main**: `pnpm turbo bench` runs both core and react benchmarks and outputs timing results. Build, lint, check, test all pass. Playwright e2e (including TASK-005 visual regression) still passes.

- **Merge commit**: merge of branch `task-004/perf-testing-scaffold` into main (8 files, +199 lines).

## Notes
