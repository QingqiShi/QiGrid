# TASK-001: Repository setup

- **Assignee:** —
- **Blocked by:** —

## Acceptance criteria

- pnpm workspace initialised with `pnpm-workspace.yaml`
- Root `package.json` with workspace scripts
- `turbo.json` with task pipeline (`build`, `check`, `lint`, `test`, `e2e`)
- Shared `tooling/tsconfig/base.json`
- `packages/core/` and `packages/react/` with their own `package.json` and `tsconfig.json`
- `apps/playground/` as a Vite + React app that imports `@qigrid/react`
- tsdown configured for both packages (ESM + CJS + declarations)
- `pnpm install && pnpm turbo build` succeeds
- Playground dev server starts

## Notes
