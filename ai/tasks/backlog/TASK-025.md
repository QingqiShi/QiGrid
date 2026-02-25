# TASK-025: Bundle size CI gate + final validation

**Phase:** 4 — Polish
**Blocked by:** TASK-024

## Goal

Add automated bundle size enforcement. Validate the complete v1 feature set meets all acceptance criteria.

## Acceptance criteria

### Bundle size gate

- Script that measures the minified + gzipped size of `@qigrid/core` ESM output
- Script fails (exit code 1) if size exceeds 30kb
- Integrated into turbo pipeline (`pnpm turbo size` or part of build)
- Size printed in output for visibility

### Final validation checklist

- [ ] Sorting works (client-side, single and multi-column)
- [ ] Filtering works (client-side, column filters with AND logic)
- [ ] Row virtualization works (10k+ rows, smooth scroll)
- [ ] Row grouping works (single and multi-level, expand/collapse)
- [ ] Row expansion / detail views work
- [ ] Column auto-sizing works (model + measurement hook)
- [ ] Keyboard navigation works (arrow keys, Home/End, PageUp/PageDown)
- [ ] Data export works (CSV/TSV/JSON) — if implemented (stretch)
- [ ] Bundle size ≤ 30kb minified + gzipped
- [ ] All performance benchmarks pass targets (TASK-024)
- [ ] Playground demonstrates all features
- [ ] All tests pass (unit, e2e, visual regression, benchmarks)
- [ ] Zero third-party runtime dependencies

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- Bundle size gate passes
