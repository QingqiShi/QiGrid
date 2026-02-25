# TASK-013: Architecture review checkpoint

**Phase:** 0 — Architecture refactor (post-refactor gate)
**Blocked by:** TASK-012

## Why

TASK-011 and TASK-012 are a major structural rewrite — converting from a stateful engine to stateless pure functions + React-native state. Every subsequent task builds on this foundation. A quick review before Phase 1 prevents compounding design problems through 10 more tasks.

## Goal

Validate that the refactored architecture is ready for Phase 1+ features. This is a review task, not an implementation task.

## Checklist

### Pipeline type composition

- [ ] Verify the pipeline stages compose cleanly: can you type-check a chain of `filter → sort → group → expand → flatten → virtualize` with consistent input/output types?
- [ ] Each transform takes rows in, returns rows out (or a structure that flattens to rows)
- [ ] The type system supports future row type discriminators (`'leaf' | 'group' | 'detail'`) without breaking existing transforms

### Tree-shakeability

- [ ] Each transform function is independently importable from `@qigrid/core`
- [ ] Unused transforms are eliminated by the bundler (verify with a minimal import + build)

### `useGrid` API surface

- [ ] The return shape of `useGrid` can accommodate all planned features without breaking changes:
  - Sorting state + updaters (already exists)
  - Filter state + updaters (already exists)
  - Column width state + updaters (TASK-014)
  - Grouping state + updaters (TASK-017)
  - Expansion state + updaters (TASK-018)
  - Keyboard focus state + updaters (TASK-019)
- [ ] The hook accepts options for features not yet implemented without error (forward-compatible shape)

### Memoization boundaries

- [ ] Each `useMemo` stage has correct dependency arrays
- [ ] Changing sort state does NOT recompute filtering
- [ ] Changing filter state does NOT recompute sorting (but does recompute downstream)

### Documentation sync

- [ ] Update CLAUDE.md if the refactor changes any workflow instructions
- [ ] Update MEMORY.md to reflect the new architecture (remove stale references to `createGrid`, `useSyncExternalStore`)

## Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- All checklist items verified
