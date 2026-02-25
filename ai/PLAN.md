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
- **Zero runtime dependencies** — React is the sole peerDependency

---

## v1 Scope

### Required features

- **Sorting** — client-side, single and multi-column, custom comparators
- **Filtering** — client-side, column filters with AND logic, custom filter functions
- **Row virtualization** — smooth scrolling at 100k+ rows, required capability (packaging flexible for size budget)
- **Row grouping** — group by one or more columns, collapsible groups, nested hierarchy
- **Row expansion / detail views** — expand individual rows to show detail content
- **Column auto-sizing** — model + integration hooks only; DOM measurement is consumer-side
- **Keyboard navigation** — cell-level roving focus, arrow keys, Home/End, PageUp/PageDown, Enter/Space action
- **Data export** — CSV/TSV/JSON from current grid state (filters/sort/grouping applied)

### Not in scope (v1)

- Server-driven / manual modes for sorting and filtering
- Screen reader / assistive-technology support (ARIA). Keyboard-only operation is guaranteed.
- Styled UI theme in the core package
- Plugin / extension system (unless needed for size budget)
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
| `createGrid` (no sort/filter) | 100k rows | ≤ 50ms |
| Sort toggle (single column, strings) | 100k rows | ≤ 40ms |
| Filter change (string includes) | 100k rows | ≤ 30ms |
| Group by (single column) | 100k rows | ≤ 60ms |
| `setScrollTop` (virtual range recalc) | 1M rows | ≤ 1ms |
| `getVisibleRows` | 1M rows | ≤ 0.5ms |

### Rendering benchmarks

| Operation | Dataset | Target |
|---|---|---|
| Virtualized grid mount (via renderHook) | 10k rows | ≤ 100ms |
| Scroll update (setScrollTop + re-render) | 100k rows | ≤ 16ms (one frame) |

### Virtualization validation

- DOM node count stays constant regardless of dataset size (visible rows + overscan only)
- Scrolling 100k rows produces no long tasks (>50ms) in a Playwright trace
- Row expansion while scrolled mid-list does not cause disruptive scroll jumps

---

## Architecture

### Monorepo structure

```
qigrid/
  packages/
    core/           # framework-agnostic grid engine (state, sorting, filtering, virtualization, grouping)
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

- **`@qigrid/core`** — zero React dependency. Pure TypeScript. Owns all grid state, data transformations (sort, filter, group, expand), virtualization math, column/row models, keyboard focus model, and export logic. Exports `createGrid(options)` factory returning a grid instance with methods and reactive state.
- **`@qigrid/react`** — depends on `@qigrid/core`. Provides `useGrid<TData>(options)` hook wrapping the core instance via `useSyncExternalStore`. Exports optional components (e.g., `<VirtualGrid>`) and hooks (e.g., `useColumnAutoSize`).

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

### Derived model pipeline

Models are computed in stages. Changes in one domain only recompute downstream stages:

```
data → filter → sort → group → expand → flatten → virtualize → visible rows
```

### Virtualization strategy

Custom implementation (zero-dependency constraint):

- **Row windowing** — calculate visible row range from scroll position + container height + row height. Only render rows within the visible window plus overscan buffer.
- **Scroll container** — outer `div` with `overflow: auto`, inner spacer `div` sized to full virtual height for native scrollbars.
- **Absolute positioning** — visible rows positioned using `transform: translateY()` for GPU-composited movement.
- **Fixed row height** — v1 uses fixed row height. Variable heights are a future enhancement.
- **Sticky headers** — `position: sticky` with appropriate z-index layering.
- **Overscan** — configurable extra rows above/below viewport (default: 5) to reduce flicker during fast scrolling.

This is the highest-risk custom code. Mitigations: aggressive edge-case testing, Playwright scroll scenarios, benchmark validation against performance targets.

---

## Tech Stack

| Area | Tool | Why |
|---|---|---|
| Package manager | pnpm | Content-addressable store, workspace protocol |
| Monorepo orchestration | Turborepo | Lightweight, task caching |
| Build | tsdown | Rust-based (Rolldown), supports `isolatedDeclarations` |
| Output formats | ESM + CJS + declarations | Dual-format for consumer compatibility |
| Linting + formatting | Biome | Single tool, 10-25x faster than ESLint + Prettier |
| Unit tests | Vitest + @testing-library/react | Native ESM, fast |
| E2E tests | Playwright | Cross-browser, parallel |
| Visual regression | Playwright `toHaveScreenshot()` | No external service needed |
| Performance benchmarks | Vitest bench | CI-trackable, measurable |
| Virtualization | Custom (zero deps) | Full control, no runtime dependency |
| Playground | Vite app | Integration demos |

### TypeScript config

Shared base in `tooling/tsconfig/base.json`:

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- `isolatedDeclarations: true` (fast declaration emit via tsdown)
- `moduleResolution: "bundler"`, `target: "ES2022"`, `module: "ESNext"`

### Tooling versions

- Biome v2.4.4, Vitest v4.0.18, Playwright v1.58.2, tsdown v0.20.3
- React 19 (peer dep range: ^18 || ^19), TypeScript ~5.8.0

---

## Definition of Done

The project is complete when:

- All v1 required features are implemented, tested, and demonstrated in the playground
- All performance targets are met and validated by automated benchmarks
- Bundle size ≤ 30kb enforced by CI
- Keyboard navigation works as defined in v1 scope
- All tests pass: unit, E2E, visual regression, benchmarks
- Zero runtime dependencies (React as sole peerDependency for `@qigrid/react`)
- Core exports no styled components (headless boundary maintained)

---

## Risks

### Custom virtualization

Building a correct, performant row virtualizer from scratch is the highest-risk work. Edge cases with fast scrolling, row expansion, sticky headers, and resize break easily. Mitigated by aggressive Playwright testing and benchmarks.

### 30kb size budget

Zero deps means every feature adds bytes with no library to share the load. Row grouping, expansion, export, and keyboard nav must all fit. Monitor bundle size continuously. If the budget is tight, virtualization can be packaged as a separate tree-shakeable entry point.

### Row grouping complexity

Grouping introduces a hierarchical row model (group rows vs leaf rows), interacts with sorting (within-group), filtering (pre-group), expansion (group collapse), and virtualization (variable-height-like behavior with collapsed groups). Needs careful integration testing across all pipeline stages.

---

## Known Issues

- **react-component-benchmark v2.0.0** requires React ^18, incompatible with React 19. Using Vitest bench + renderHook instead.
- **Parallel tasks touching same core files** (types.ts, createGrid.ts, index.ts) will have merge conflicts. Merge sequentially.
- **`pnpm turbo bench`** configured with `cache: false` (benchmarks must never be cached).
