# QiGrid — Claude Code Instructions

## Session startup

Every session starts fresh with no prior context. Do this first:

1. Read `ai/PLAN.md` — understand goals, scope, architecture, and performance targets.
2. Read `ai/tasks/` directories — `backlog/`, `in-progress/`, `done/`. This is the source of truth for what's been done and what's next.
3. If a task is in `in-progress/`, check `git log` and `git status` to understand where it was left off. Resume it — don't restart from scratch.
4. If nothing is in progress, pick the next unblocked task from `backlog/` (check its `Blocked by` field against `done/`).

## How to work on a task

1. Create a feature branch: `git checkout -b task-NNN-short-description`
2. Move the task file to `ai/tasks/in-progress/`.
3. Read the task file fully — it has acceptance criteria and edge cases.
4. Read the existing code you'll be modifying before writing anything.
   _Note_ You are WELCOME to challenge the task if you notice something inconsistent or you think it's not the right thing to work on. You should feel empowered to stop and voice your concerns.
5. Implement, commit with descriptive messages explaining _what_ and _why_.
6. Run the quality gate: `pnpm build && pnpm lint && pnpm check && pnpm test`
7. If the task touches the playground: `pnpm --filter @qigrid/playground e2e`
8. Move the task file to `ai/tasks/done/`.
9. Push and open a PR: `git push -u origin HEAD && gh pr create --fill`
10. CI must pass before merge. Use `gh pr merge --squash` to merge.

## When a session ends mid-task

The user may stop you at any point. To make the next session's resume smooth:

- **Commit early and often.** Uncommitted work is lost between sessions.
- **Write descriptive commit messages.** After context is lost, `git log` is the only history.
- If the task isn't finished, leave it in `ai/tasks/in-progress/`. The next session will pick it up via step 3 above.

## Self-improvement

This file is your persistent memory. **You are expected to update it.**

- If the user corrects your behavior — especially more than once — add a rule to the "Learned lessons" section so future sessions don't repeat the mistake.
- If you discover a non-obvious tooling quirk, environment issue, or workflow pitfall during implementation, add it too.
- Keep entries concise and actionable. Write them as instructions to your future self, not as notes about what happened.
- Remove entries that are no longer relevant (e.g., a workaround for a bug that's been fixed).
- If you notice inconsistent instructions.

## Architecture

- **Core** exports stateless pure functions: `filterRows`, `sortRows`, `groupRows`, `flattenGroupedRows`, `buildColumnModel`, plus state helpers `cycleSort`, `updateColumnFilter`
- `filterRows` and `sortRows` accept `Column<TData>[]` (resolved model), not `ColumnDef<TData>[]` — callers pass pre-built columns
- `Column<TData>` carries `filterFn` and `sortingFn` from the def — no need for separate def lookups
- **Row type discriminator**: `GridRow<TData> = LeafRow<TData> | GroupRow` (discriminated union with `type: "leaf" | "group"`)
- **React** `useGrid` hook owns all state via `useReducer` (extracted to `gridReducer.ts`), chains `useMemo` stages: columnModel → filter → row-wrap → sort → group+flatten
- Pipeline: `data → filter → wrap Row[] → sort → group → flatten → virtualize`. When `grouping: []`, group/flatten skipped (rows wrapped as `LeafRow`)
- Collapsed state: `collapsedGroupIds: Set<string>` (all groups expanded by default)
- Group IDs: deterministic `"columnId:value"` joined by `>` for nesting

### React package structure

- `gridReducer.ts` — reducer + internal types (GridInternalState, GridAction), includes grouping/collapsed state + actions
- `useGrid.ts` — the hook that uses the reducer, `rows` returns `GridRow<TData>[]`
- `useColumnResize.ts` — pointer-capture based column resize hook
- `VirtualGrid.tsx` — virtualized grid component with group row rendering branch
- `types.ts` — public types only (VirtualGridProps, UseGridReturn)

## Learned lessons

This section is updated as we discover things that affect how work should be done.

- **`pnpm bench`** runs: (1) core Vitest benchmarks (pure functions), (2) react Playwright benchmarks (6 browser scenarios via CDP against `@qigrid/benchmark` harness). Benchmarks are never cached (`cache: false` in turbo).
- **React benchmarks** use Playwright + CDP, not JSdom. The `@qigrid/benchmark` package provides the harness app (port 5174) and shared helpers. Bench specs live in `packages/react/bench/`.
- **Biome v2 config** differs from v1 — no `files.ignore`, uses VCS gitignore instead.
- **pnpm `--filter`** — run commands in a specific package from the repo root: `pnpm --filter @qigrid/react bench`. Never `cd` into sub-packages.
- **Playwright e2e tests** — run from repo root: `pnpm --filter @qigrid/playground e2e`
- **Visual regression baselines** — if the playground UI changes, Playwright screenshot tests will fail. Update baselines with `pnpm --filter @qigrid/playground e2e --update-snapshots` and commit the new baselines.
- **Biome auto-fix** — run `pnpm --filter @qigrid/core lint --write` (and same for other packages you touched) before the quality gate to auto-fix formatting and import ordering.
- **pnpm script args** — pass extra args directly (no `--` separator): `pnpm --filter @pkg script --flag`. A `--` becomes a literal arg to the script, which breaks tools like Playwright that interpret it as a test filter.
- **Never assume lint warnings are "pre-existing"** — fix all warnings, no exceptions.
