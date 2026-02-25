# TASK-002: Guardrails

- **Assignee:** —
- **Blocked by:** TASK-001

## Acceptance criteria

- `biome.json` at root with strict linting and formatting rules
- `pnpm turbo lint` runs `biome check`
- `pnpm turbo check` runs `tsc --noEmit` across all packages
- Vitest configured in both packages (`@testing-library/react` + `jsdom` for the react package)
- A trivial passing test in each package
- Playwright configured in `apps/playground/` with a trivial test
- `pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
- Playwright test runs locally

## Implementation notes

- **Biome v2.4.4** — `biome.json` at root. Strict recommended rules, 2-space indent, double quotes, trailing commas, semicolons, import organization. VCS integration respects `.gitignore`.
- **Vitest v4.0.18** — root devDep shared across packages. Core uses node environment, React uses jsdom. Test files: `packages/core/src/__tests__/createGrid.test.ts` (2 tests), `packages/react/src/__tests__/useGrid.test.tsx` (1 test using renderHook).
- **Playwright v1.58.2** — chromium only, in playground. Config at `apps/playground/playwright.config.ts` with webServer pointing to `pnpm dev` on port 5173. Test at `apps/playground/e2e/grid.spec.ts` (checks heading, 9 column headers, 100 data rows).
- **Dependencies added:** `@biomejs/biome` and `vitest` at root; `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` in react package; `@playwright/test` in playground.
- **Scripts added:** `lint` (biome check) in core, react, playground. `test` (vitest run) in core, react. `e2e` (playwright test) in playground.
- **No turbo.json changes needed** — existing task pipeline already had correct task definitions.
- **Commits:** `862b9bc`, `337158f` (biome format fixes after TASK-003 merge)

## Notes
