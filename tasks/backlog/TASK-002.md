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

## Notes
