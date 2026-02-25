# TASK-003: Playground integration

- **Assignee:** —
- **Blocked by:** TASK-001

## Acceptance criteria

- Playground imports `@qigrid/react` and renders a basic grid
- Hardcoded column definitions and sample data (100 rows)
- `pnpm --filter playground dev` shows a rendered grid with headers and rows

## Implementation notes

- **App.tsx rewritten** — renders 100-row employee grid via `useGrid` from `@qigrid/react`. 9 columns: ID, First Name, Last Name, Email, Department, Job Title, Salary, Start Date, Location. Per-column formatting via `CellValue` component (currency for salary, colored department badges, blue emails).
- **data.ts (new)** — `generateEmployees(count)` with seeded PRNG (seed 42) for deterministic data. Realistic department-aware salary ranges and job titles. `Employee` interface with all fields.
- **grid.css (new)** — clean table styling: sticky header, alternating rows, hover, scrollable container (max-height 600px), tabular-nums for numeric columns.
- **Uses both `accessorKey` and `accessorFn`** column definition patterns.
- **No package.json changes** — only source files added/modified.
- **Commits:** `18e4fa5`, `4052214` (merge with conflict resolution in App.tsx), `337158f` (biome fixes)

## Notes
