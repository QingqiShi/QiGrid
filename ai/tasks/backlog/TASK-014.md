# TASK-014: Row grouping

**Phase:** 3 — Core features
**Blocked by:** TASK-013 (needs virtualization for grouped row rendering)

## Goal

Implement row grouping in core. Users can group rows by one or more columns, producing a hierarchical row model with group header rows and leaf rows. Groups are collapsible.

## Acceptance criteria

### Core (`@qigrid/core`)

- `GridOptions` accepts optional `grouping?: string[]` (array of column IDs to group by)
- `GridInstance` exposes `setGrouping(columnIds: string[])` and `toggleGroupExpanded(groupId: string)`
- `GridState` includes `grouping: string[]` and `expandedGroupIds: Set<string>` (or equivalent)
- When grouping is active, `getRows()` returns a flat list interleaving group rows and leaf rows:
  - Group rows have a `type: 'group'` discriminator, `groupValue`, `depth`, `childCount`, `isExpanded`
  - Leaf rows have `type: 'leaf'` (or the existing Row shape with a discriminator)
- Collapsed groups hide their children from `getRows()` output
- Multi-level grouping: grouping by [A, B] creates nested groups (A groups containing B subgroups)
- Pipeline: filter → group → sort (within groups) → flatten → virtualize
- Group IDs are deterministic (e.g., `"department:Engineering"` or `"department:Engineering>role:Senior"`)

### Edge cases

- Group by column with all identical values (single group)
- Group by column with all unique values (N groups of 1)
- Empty data
- Grouping change recalculates row model
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
- Group IDs are stable across re-renders

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
