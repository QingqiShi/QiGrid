# TASK-004: Performance testing scaffold

- **Assignee:** —
- **Blocked by:** TASK-002, TASK-003

## Acceptance criteria

- Vitest bench files in `packages/core/` measuring: grid instance creation, sorting 100k rows, filtering 100k rows
- react-component-benchmark tests in `packages/react/` measuring mount and update times
- `pnpm turbo bench` runs and outputs timing results locally

## Notes
