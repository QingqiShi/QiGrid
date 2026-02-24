# Creating QiGrid

## Motivation

Existing React data grid libraries share recurring problems:

- **API friction** — opaque, imperative APIs that fight React’s data flow model
- **Unreliable server data** — optimistic updates, partial rendering, and caching that work inconsistently
- **Performance collapse** — virtualization failures, excessive re-renders, and main-thread blocking beyond trivial datasets
- **Stability churn** — frequent breaking changes requiring quarterly rewrites
- **Styling lock-in** — proprietary styling systems that can’t be swapped
- **Bundle bloat** — 1-3 seconds added to load times

## Goals

### Design principles

- **Zero runtime dependencies** — everything shipped is our own code. React is the sole `peerDependency` for `@qigrid/react`.
- **Declarative-first API** aligned with React’s state model — no wrappers, no adapter layers
- **Headless core with optional components** — use pre-styled themes or full headless mode for complete control
- **Feature-complete from a single install** — sorting, filtering, row grouping, column auto-sizing, detail views, data export, pivot tables, tree data, server-side loading, custom cell rendering, rich cell editing. Consumers install `@qigrid/react` which includes everything.

### Performance targets

- Core bundle: <=30kb gzipped
- Handle 10,000+ state updates per second
- Render 1M+ rows via virtualization without degradation
- These targets must be validated by automated benchmarks (see TASK-004 in Initial Tasks)

### Non-functional requirements

- MIT licensed, public GitHub support
- Accessible (WCAG 2.1 AA) — keyboard navigation, screen reader support, ARIA attributes
- Browser support: last 2 versions of Chrome, Firefox, Safari, Edge
- React support: React 18+ (with React 19 compatibility)

## Architecture

### Monorepo structure

```
qigrid/
  packages/
    core/           # framework-agnostic grid engine (state, sorting, filtering, virtualization logic)
    react/          # React bindings — hooks (useGrid) and optional pre-styled components
  apps/
    playground/     # Vite app for full-grid integration demos and manual testing
  tasks/
    backlog/        # task files awaiting work
    in-progress/    # task files being worked on
    review/         # merged to main, awaiting QA verification
    done/           # completed task files
  tooling/
    tsconfig/       # shared TypeScript base configs
  turbo.json
  pnpm-workspace.yaml
  package.json
  biome.json
```

Scope: `@qigrid/*` on npm.

### Package boundaries

- `@qigrid/core` — zero React dependency. Pure TypeScript. Owns all grid state, data transformations (sort, filter, group, pivot), virtualization math, and column/row models. Exports a `createGrid(options)` factory that returns a grid instance with methods and reactive state.
- `@qigrid/react` — depends on `@qigrid/core`. Provides `useGrid<TData>(options)` hook that wraps the core instance in React state. Optionally exports pre-styled components (`<Grid>`, `<HeaderCell>`, `<Row>`, etc.) that can be used directly or replaced entirely in headless mode.

### Type design

The grid is generic over row data:

```typescript
interface ColumnDef<TData> {
  id: string;
  accessorKey?: keyof TData & string;
  accessorFn?: (row: TData) => unknown;
  header: string;
}

interface GridOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
}

function useGrid<TData>(options: GridOptions<TData>): GridInstance<TData>;
```

### Virtualization strategy

Custom implementation (zero-dependency constraint rules out TanStack Virtual):

- **2D windowing** — calculate visible row and column ranges from scroll position + container dimensions. Only render cells within the visible window plus an overscan buffer.
- **Scroll container** — a single outer `div` with `overflow: auto`. An inner spacer `div` is sized to the full virtual dimensions (`totalRowHeight x totalColumnWidth`) to produce native scrollbars.
- **Absolute positioning** — visible rows/cells are absolutely positioned within the scroll container using `transform: translateY/translateX` for GPU-composited movement.
- **Variable sizes** — support both fixed and dynamic (measured) row heights and column widths. Use a size cache that invalidates on data or column changes.
- **Sticky headers/columns** — use `position: sticky` with appropriate `z-index` layering for frozen header rows and pinned columns.
- **Overscan** — render a configurable number of extra rows/columns outside the viewport to reduce flicker during fast scrolling.

This is the highest-risk piece of custom code in the project. Mitigations:

- Study TanStack Virtual's source as a reference implementation
- Aggressively test edge cases: fast scrolling, variable row heights, resize, scroll restoration, frozen columns
- Benchmark against TanStack Virtual to validate we're not regressing on performance

## Tech Stack

| Area                   | Tool                                           | Why                                                                       |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Package manager        | pnpm                                           | Content-addressable store, workspace protocol, fast installs              |
| Monorepo orchestration | Turborepo                                      | Lightweight, task caching, simple config                                  |
| Build                  | tsdown                                         | Successor to tsup, Rust-based (Rolldown), supports `isolatedDeclarations` |
| Output formats         | ESM (`.mjs`) + CJS (`.cjs`) + `.d.mts`/`.d.ts` | Dual-format for maximum consumer compatibility                            |
| Linting + formatting   | Biome                                          | Single tool replacing ESLint + Prettier, 10-25x faster                    |
| Unit tests             | Vitest + @testing-library/react                | Native ESM, fast, Jest-compatible API                                     |
| E2E tests              | Playwright                                     | Cross-browser (incl. WebKit), fast, parallel                              |
| Visual regression      | Playwright `toHaveScreenshot()`                | Free, runs in CI, no external service needed                              |
| Performance benchmarks | Vitest bench + react-component-benchmark       | Measurable mount/update/unmount times, CI-trackable                       |
| Virtualization         | Custom (zero deps)                             | Full control, no runtime dependency                                       |
| Playground             | Vite app                                       | Full control for integration demos                                        |

### TypeScript config (strict)

Shared base in `tooling/tsconfig/base.json`:

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- `isolatedDeclarations: true` (enables fast declaration emit via tsdown)
- `moduleResolution: "bundler"`, `target: "ES2022"`, `module: "ESNext"`

## Workflow

This project is built by a **team of concurrent agents** (via `TeamCreate`), not sequential sub-agents. The main agent spawns long-lived teammates that run in parallel, communicating through `SendMessage` and coordinating through the `tasks/` directory.

### Team

Created via `TeamCreate` at the start of each work session:

| Role | How spawned | Works on | Responsibility |
|---|---|---|---|
| **Main agent** | Already running (team lead) | Main working tree | Creates team, spawns teammates, coordinates. Moves task files to `in-progress/` when spawning developers. Does not write code. |
| **Planner** | Spawned once, persists | Main working tree | Keeps the backlog populated. See "Continuous planning" below. |
| **Developer(s)** | Spawned per-task with `isolation: "worktree"` | Isolated worktree | Implements tasks. Stays alive during review to address feedback. One per task, multiple can run in parallel. |
| **Tech Lead** | Spawned once, persists | Main working tree | Per-task: reviews code, merges to main, resolves conflicts. Periodic: reviews overall architecture and completeness, flags divergence to Planner, makes and documents technical decisions. |
| **QA** | Spawned once, persists | Main working tree | Per-task: verifies completed work on main against acceptance criteria. Periodic: sweeps codebase for quality issues, dead code, and inconsistencies — raises tasks in backlog. |

Developers are only spawned when their task is unblocked (all dependencies merged to main). Each gets a fresh worktree branched from the current HEAD. Developers remain alive (idle) while their task is in review — the main agent can resume them via `resume` if fixes are needed.

### Task board

The kanban board is a directory structure. A task's location *is* its status:

```
tasks/
  backlog/        # Planner creates new task files here
  in-progress/    # Task is being worked on by a developer
  review/         # Merged to main, awaiting QA verification
  done/           # Passed review and QA
```

Each task is a single markdown file (e.g., `TASK-001.md`). Moving a task between columns is a file move (`mv tasks/backlog/TASK-001.md tasks/in-progress/TASK-001.md`). To read the board, list the contents of each directory.

**Only main-working-tree agents move and edit task files.** Developers work in isolated worktrees and cannot touch task files — their worktree branches from HEAD at spawn time, so any task file moves on main would conflict at merge. Developers communicate everything via `SendMessage`.

When the Planner creates a new task, it scans all four directories for the highest existing task number and increments.

### Task lifecycle

1. **Main agent** messages **Planner** when `tasks/backlog/` has fewer than 2 unblocked tasks (i.e., tasks whose `Blocked by` dependencies are all in `tasks/done/`)
2. **Planner** reads `PLAN.md` + `tasks/` + the codebase, creates new task files in `tasks/backlog/`
3. **Main agent** picks an unblocked task, writes the developer's name to the task file, moves it to `tasks/in-progress/`, spawns a **Developer** worktree
4. **Developer** implements, commits on worktree branch, sends `SendMessage` to **Tech Lead** with: task ID, branch name, summary of changes, key decisions made. Developer goes idle (stays alive).
5. **Tech Lead** writes the developer's implementation notes to the task file, reviews the code on the worktree branch:
   - Pass → merges to main (`git merge <branch>`), resolves conflicts if any, moves task file to `tasks/review/`, messages **QA**
   - Fail → adds review notes to task file (keeps it in `tasks/in-progress/`), messages **Main agent** who resumes the **Developer** with the feedback. Returns to step 4.
6. **QA** verifies on main against acceptance criteria:
   - Pass → moves task file to `tasks/done/`, messages **Main agent**. Developer is shut down.
   - Fail → adds QA notes to task file, moves original to `tasks/done/` (the work was completed and merged), creates a new `[QA]-TASK-XXX.md` in `tasks/backlog/` describing the fix needed and linking to the original. Messages **Main agent**. Developer is shut down (code is on main — a fresh worktree is needed for the fix).
7. **Main agent** checks `tasks/backlog/` — if running low, returns to step 1

**Critical rules:**
- The main agent must not spawn a developer worktree until all of that task's `Blocked by` dependencies are in `tasks/done/`
- Tech Lead review failures keep the developer alive — the developer still has their worktree context and can address feedback directly
- QA failures after merge require a fresh developer — the code is on main, so a new worktree (with the latest state) is spawned through the normal flow

### Context preservation

Agent context is lost on compaction. All durable knowledge must live in files.

**On every compaction**, agents must re-read `PLAN.md` and the `tasks/` directory before resuming.

**Task files are the memory.** Each task file is kept up to date by main-working-tree agents:
- **Acceptance criteria** — written by Planner when creating the task
- **Implementation notes** — written by Tech Lead from the developer's `SendMessage` when moving to `review/`
- **Review notes** — written by Tech Lead if review fails (what needs fixing and why)
- **QA notes** — written by QA if verification fails (what broke and how to reproduce)

**Commit messages matter.** Developers must write descriptive commit messages that explain *what* was built and *why* key decisions were made. After compaction, `git log` is the only way to reconstruct implementation history.

**No write conflicts.** Developers never touch task files (worktree isolation prevents it). All task file edits happen on the main working tree. The folder structure ensures only one main-working-tree agent owns a task file at a time — ownership transfers with the file move.

### Continuous planning

The Planner derives tasks from the Goals and Architecture sections of this plan — not from a hardcoded phase list.

**Process:**
1. Read `PLAN.md` (Goals, Architecture, Risks) and all task files across `tasks/` directories
2. Read the codebase to understand what actually exists
3. Identify the gap between the goals and the current state
4. Create 3-5 new task files in `tasks/backlog/` with clear acceptance criteria and `Blocked by` dependencies

**Prioritisation order:**
1. Infrastructure and tooling (repo setup, build, test scaffolding)
2. Core grid engine (state model, column/row models, `createGrid` factory)
3. React bindings (`useGrid` hook, `useSyncExternalStore` bridge)
4. Virtualization (2D windowing, scroll container, overscan)
5. Basic features (sorting, filtering, column sizing)
6. Playground integration for each feature (proves it works end-to-end)
7. Intermediate features (row selection, column pinning, keyboard navigation, accessibility)
8. Advanced features (row grouping, tree data, cell editing, server-side data, data export)
9. Enterprise features (pivot tables)
10. Pre-styled theme components (headless-first, components on top)

### Periodic oversight

In addition to their per-task responsibilities, the Tech Lead and QA perform periodic sweeps. The main agent triggers these between task batches or when a natural milestone is reached (e.g., after several tasks move to `done/`).

**Tech Lead — architecture review:**
- Reviews the overall codebase against the Architecture section of this plan
- Checks that package boundaries are respected (`core` has no React imports, `react` doesn't duplicate core logic)
- Verifies the codebase is converging toward the goals, not diverging
- If divergence is found, messages the **Planner** to create corrective tasks
- Makes and documents technical decisions in task files or commit messages (e.g., "chose X approach over Y because Z")

**QA — quality sweep:**
- Reviews the codebase for quality issues: dead code, unused exports, inconsistent patterns, missing tests
- Checks that performance targets are still being met as new code is added (runs benchmarks)
- Checks bundle size against the 30kb target
- Raises new tasks in `tasks/backlog/` for any issues found, prefixed with `[QUALITY]-`

### Definition of done

The project is complete when:

- All features listed in Design Principles are implemented and passing QA
- All performance targets are met and validated by benchmarks
- Accessibility requirements (WCAG 2.1 AA) are verified
- Both headless and pre-styled component modes work for every feature
- The playground demonstrates every feature end-to-end
- All tests pass locally (unit, E2E, visual regression, performance benchmarks)
- Zero runtime dependencies (`react` as sole peerDependency for `@qigrid/react`)

The Planner checks this list after each batch completes. When all criteria are met, Planner notifies the main agent that the project is complete.

## Initial Tasks

See `tasks/backlog/` for the full task files. The initial tasks in dependency order:

1. **TASK-001: Repository setup** — monorepo, build, playground skeleton
2. **TASK-002: Guardrails** (blocked by 001) — biome, tsc, vitest, playwright
3. **TASK-003: Playground integration** (blocked by 001) — render a basic grid end-to-end
4. **TASK-004: Performance testing scaffold** (blocked by 002, 003) — vitest bench, react-component-benchmark
5. **TASK-005: Visual regression scaffold** (blocked by 002, 003) — playwright screenshot tests

Tasks 002 and 003 can run in parallel. Tasks 004 and 005 can run in parallel.

## Potential Issues and Risks

### Architecture

- **Core/React boundary is the hardest design decision.** Getting the reactive state bridge right (core emits state changes, React subscribes without unnecessary re-renders) will require careful design. Consider `useSyncExternalStore` as the bridge mechanism.
- **Headless + pre-styled is a dual API surface.** Every feature needs to work in both modes. This doubles the testing surface. Start headless-only and add components as a layer on top — never the reverse.
- **Pivot tables and tree data are the most complex features.** Defer these to later phases. Get sorting, filtering, column sizing, and virtualization rock-solid first.

### Performance

- **30kb gzipped is achievable with zero deps** but leaves no room for waste. Every feature adds bytes with no library to share the load. Monitor bundle size from day one. Consider a size budget per package.
- **10,000 updates/sec requires careful state architecture.** Batching updates, avoiding React reconciliation on every change, and potentially using a signal-based or observable pattern in core will be necessary.
- **Custom virtualization is the highest-risk item.** Building a correct, performant 2D virtualizer from scratch is significant engineering. Edge cases with variable row heights, sticky headers, scroll restoration, and resize observers break easily. The Playwright E2E tests should cover scroll scenarios aggressively. Study TanStack Virtual's source as a reference but do not depend on it at runtime.

### Tooling

- **tsdown is relatively new.** It's the official successor to tsup but may have edge cases. Have a fallback plan (tsup or plain rollup) if blockers emerge.
- **Biome doesn't cover 100% of typescript-eslint rules.** The `tsc --noEmit` check covers type safety, but some stylistic rules may be missing. Acceptable tradeoff for speed.

### Scope

- **Feature list is ambitious for a new library.** Prioritise ruthlessly: Phase 1 should be core grid rendering + virtualization + sorting + filtering. Everything else (grouping, pivots, tree data, editing, export) is Phase 2+.
- **React 19 compatibility needs early validation.** Test against both React 18 and 19 from the start to catch issues early.
