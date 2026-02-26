# TASK-017: Row grouping

**Phase:** 3 — Core features
**Blocked by:** TASK-016 (needs virtualization for grouped row rendering)

## Goal

Implement row grouping as pure functions in core. Users can group rows by one or more columns, producing a hierarchical row model with group header rows and leaf rows. Groups are collapsible.

## Acceptance criteria

### Core (`@qigrid/core`)

- Pure function to group rows: takes rows + column IDs to group by + column model → returns grouped structure
- Pure function to flatten grouped rows: takes grouped structure + expanded group IDs → returns flat list interleaving group rows and leaf rows
  - Group rows have a `type: 'group'` discriminator, `groupValue`, `depth`, `childCount`, `isExpanded`
  - Leaf rows have `type: 'leaf'` (or equivalent discriminator)
- Collapsed groups hide their children from the flattened output
- Multi-level grouping: grouping by [A, B] creates nested groups
- Pipeline: filter → group → sort (within groups) → flatten → virtualize
- Group IDs are deterministic (e.g., `"department:Engineering"` or `"department:Engineering>role:Senior"`)

### React (`@qigrid/react`)

- `useGrid` (or a companion hook) manages grouping state and expanded group IDs
- Exposes updaters to set grouping columns and toggle group expansion

### Edge cases

- Group by column with all identical values (single group)
- Group by column with all unique values (N groups of 1)
- Empty data
- Filter applies before grouping (groups reflect filtered data)
- Sort applies within groups (leaf rows sorted within their group)

### Playground

- Add a "Group by" dropdown (e.g., group by department)
- Group headers are visually distinct (indented, bold, show count)
- Click group header to expand/collapse
- Grouping works alongside sorting and filtering

### Tests

- Single-level grouping produces correct group + leaf rows
- Multi-level grouping produces nested structure
- Expand/collapse toggles child visibility
- Filter → group pipeline order
- Sort within groups
- Empty groups after filtering
- Group IDs are stable

### Performance

- Benchmark: group by single column on 100k rows ≤ 60ms median (Vitest bench)
- Benchmark: flatten grouped rows on 100k rows ≤ 20ms median (Vitest bench)
- Add these as bench cases in this task — don't defer to TASK-024

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- `cd apps/playground && npx playwright test` — including new tests for:
  - Group expand/collapse toggles child visibility
  - Group header renders with count and visual distinction
  - Grouping works alongside sorting and filtering
