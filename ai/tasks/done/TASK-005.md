# TASK-005: Visual regression scaffold

- **Assignee:** —
- **Blocked by:** TASK-002, TASK-003

## Acceptance criteria

- Playwright visual regression tests using `toHaveScreenshot()` against the playground
- Baseline screenshots captured for the basic grid
- `pnpm turbo e2e` includes screenshot comparison tests that pass locally

## Implementation notes

- **`apps/playground/e2e/visual.spec.ts`** — new test file with 3 visual regression tests in a `describe("visual regression")` block. Uses `beforeEach` to set viewport to 1280x720 and wait for grid to fully render (100 rows).
- **Three baseline screenshots**: full page (`full-page.png`), grid container (`grid-container.png`), grid header (`grid-header.png`). Stored under `apps/playground/e2e/__screenshots__/` in organized subdirectories per test name.
- **`apps/playground/playwright.config.ts`** — added `snapshotPathTemplate: "{testDir}/__screenshots__/{testName}/{arg}{ext}"` for organized screenshot storage. Added `expect.toHaveScreenshot.maxDiffPixelRatio: 0.01` tolerance for sub-pixel rendering differences.
- **No turbo.json or package.json changes** — the existing `e2e` task and playground `e2e` script already route through to `playwright test`.
- **Verification**: all 4 Playwright tests pass on main (1 functional + 3 visual). Lint passes.
- **Commit**: `5d7f01b` — fast-forward merged to main.

## Notes
