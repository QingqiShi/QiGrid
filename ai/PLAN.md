# QiGrid

## Product Goal

Deliver a **headless, React-idiomatic data grid engine** that provides the data/model layer, state coordination, interaction semantics, and performance primitives for complex grids, while leaving DOM structure and styling to consumers.

### Target users

- Frontend engineers building internal tools, analytics dashboards, admin panels, and data-heavy UIs.
- Platform/UI teams that need a grid engine supporting multiple renderers and design systems.

### Value proposition

- **Headless core** — bring-your-own markup/components/styles
- **React-idiomatic API** — hooks-first, controlled/uncontrolled patterns, StrictMode/concurrency-safe
- **Performance at scale** — predictable updates and virtualization for large datasets
- **Zero third-party dependencies** — React is the sole peerDependency

---

## v1 Scope

### Required features

- **Sorting** — client-side, single and multi-column, custom comparators
- **Filtering** — client-side, column filters with AND logic, custom filter functions
- **Row virtualization** — smooth scrolling at 100k+ rows, required capability (packaging flexible for size budget)
- **Row grouping** — group by one or more columns, collapsible groups, nested hierarchy
- **Row expansion / detail views** — expand individual rows to show detail content
- **Column auto-sizing** — columns can be auto-sized to fit content
- **Keyboard navigation** — cell-level roving focus, arrow keys, Home/End, PageUp/PageDown, Enter/Space action

### Stretch

- **Data export** — CSV/TSV/JSON from current grid state (filters/sort/grouping applied)

### Not in scope (v1)

Design philosophy — these reflect intentional boundaries, not just deferral:

- Server-driven / manual modes for sorting and filtering
- Screen reader / assistive-technology support (ARIA). Keyboard-only operation is guaranteed.
- Styled UI theme in the core package
- Plugin / extension system

Future work — may be added in later versions:

- Column virtualization, pinning, resizing, reordering, visibility
- Row selection, pagination, clipboard, editing primitives
- XLSX export (adapter pattern, not core)

---

## Performance Targets

### Bundle size

| Package | Target |
|---|---|
| `@qigrid/core` (all v1 features, minified + gzipped ESM) | ≤ 30kb |

CI enforces this gate. Optional modules and UI bindings are excluded from the budget.

### Core engine benchmarks (Vitest bench, median)

| Operation | Dataset | Target |
|---|---|---|
| Sort (single column, strings) | 100k rows | ≤ 40ms |
| Filter (string includes) | 100k rows | ≤ 30ms |
| Group by (single column) | 100k rows | ≤ 60ms |
| Full pipeline (filter + sort + group) | 100k rows | ≤ 100ms |
| Virtual range computation | 1M rows | ≤ 1ms |
| Visible row slicing | 1M rows | ≤ 0.5ms |

Each benchmark measures a pure function call. The full pipeline benchmark validates all stages composed together.

### Rendering benchmarks

| Operation | Dataset | Target |
|---|---|---|
| Virtualized grid mount (via renderHook) | 10k rows | ≤ 100ms |
| Scroll update (setScrollTop + re-render) | 100k rows | ≤ 16ms (one frame) |

### Virtualization validation

- DOM node count stays constant regardless of dataset size (visible rows + overscan only)
- Scrolling 100k rows produces no long tasks (>50ms) in a Playwright trace
- Row expansion while scrolled mid-list does not cause disruptive scroll jumps

### Memory

Row model should not duplicate source data. The grid holds references to the original `data` array entries, not copies. No hard gate, but watch for unexpected allocations at scale.

---

## Architecture

### Monorepo structure

```
qigrid/
  packages/
    core/           # stateless transform functions (sorting, filtering, virtualization, grouping)
    react/          # React bindings — useGrid hook + optional components (VirtualGrid, etc.)
  apps/
    playground/     # Vite app for integration demos and manual testing
  ai/
    PLAN.md         # this file — goals, scope, architecture
    tasks/          # task board (backlog/, in-progress/, done/)
  tooling/
    tsconfig/       # shared TypeScript base configs
  turbo.json
  pnpm-workspace.yaml
  package.json
  biome.json
```

### Package boundaries

- **`@qigrid/core`** — zero React dependency. Pure TypeScript. Exports **stateless transform functions** (sort, filter, group, expand, virtualize, export) and type definitions. No state management, no subscriptions — just data in, data out.
- **`@qigrid/react`** — depends on `@qigrid/core`. **Owns all state.** The `useGrid` hook manages grid state via React primitives (`useState`/`useReducer`) and derives the row model through a `useMemo` pipeline that calls core transform functions. This lets React control scheduling — expensive operations like sorting 100k rows can use `useTransition` for non-blocking updates. Exports optional components (e.g., `<VirtualGrid>`) and hooks (e.g., `useColumnAutoSize`).

### API design principles

- The grid is generic over row data type `TData`. Columns define accessors (key-based or function-based).
- **Core is stateless.** Each transform is a pure function: rows in, transformed rows out. No side effects, no subscriptions, no internal caches.
- **React owns state and scheduling.** `useGrid` is the primary API. It manages sorting/filtering/grouping state, computes derived row models via `useMemo`, and leverages React's concurrent features (`useTransition`, `useDeferredValue`) for responsiveness under load.
- The consumer controls state transitions — `useGrid` returns state and updater functions, not an opaque instance.

### Derived model pipeline

Models are computed in stages via chained `useMemo` calls. Each stage only recomputes when its specific inputs change:

```
data → filter → sort → group → expand → flatten → virtualize → visible rows
```

Each arrow is a pure function from core. React memoizes each stage independently.

### Virtualization strategy

Custom implementation (zero-dependency constraint):

- **Row windowing** — visible row range from scroll position + container height + row height, plus configurable overscan buffer
- **Fixed row height** — v1 uses fixed row height. Variable heights are a future enhancement.
- **GPU-composited positioning** — visible rows use efficient CSS transforms for smooth scrolling

This is the highest-risk custom code. Mitigations: aggressive edge-case testing, Playwright scroll scenarios, benchmark validation against performance targets.

---

## Tech Stack

| Area | Tool | Why |
|---|---|---|
| Package manager | pnpm | Content-addressable store, workspace protocol |
| Monorepo orchestration | Turborepo | Lightweight, task caching |
| Build | tsdown | Rust-based (Rolldown), supports `isolatedDeclarations` |
| Output formats | ESM + CJS + declarations | Dual-format for consumer compatibility |
| Linting + formatting | Biome | Single tool, fast |
| Unit tests | Vitest + @testing-library/react | Native ESM, fast |
| E2E tests | Playwright | Cross-browser, parallel |
| Visual regression | Playwright `toHaveScreenshot()` | No external service needed |
| Performance benchmarks | Vitest bench | CI-trackable, measurable |
| Virtualization | Custom (zero deps) | Full control, no runtime dependency |
| Playground | Vite app | Integration demos |

Exact versions are pinned in `package.json` — this plan does not track them.

---

## Definition of Done

The project is complete when:

- All v1 required features are implemented, tested, and demonstrated in the playground
- All performance targets are met and validated by automated benchmarks
- Bundle size ≤ 30kb enforced by CI
- Keyboard navigation works as defined in v1 scope
- All tests pass: unit, E2E, visual regression, benchmarks
- Zero third-party runtime dependencies (React as sole peerDependency for `@qigrid/react`)
- Core exports no styled components (headless boundary maintained)

---

## Risks

### Custom virtualization

Building a correct, performant row virtualizer from scratch is the highest-risk work. Edge cases with fast scrolling, row expansion, sticky headers, and resize break easily. Mitigated by aggressive Playwright testing and benchmarks.

### 30kb size budget

Zero deps means every feature adds bytes with no library to share the load. Row grouping, expansion, export, and keyboard nav must all fit. Monitor bundle size continuously. If the budget is tight, virtualization can be packaged as a separate tree-shakeable entry point.

### Pipeline interaction complexity

Each pipeline stage (filter, sort, group, expand, virtualize) interacts with every other. Adding a stage doesn't add complexity linearly — it multiplies the integration test surface. Sorting within groups, filtering before grouping, expanding inside a virtualized window, collapsing groups that change virtual height — these cross-cutting interactions are where bugs hide. Mitigated by integration tests that exercise multi-stage combinations, not just individual stages in isolation.

### Row grouping complexity

Grouping introduces a hierarchical row model (group rows vs leaf rows), interacts with sorting (within-group), filtering (pre-group), expansion (group collapse), and virtualization (variable-height-like behavior with collapsed groups). Needs careful integration testing across all pipeline stages.
