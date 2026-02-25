# QiGrid — Claude Code Instructions

## Session startup

Every session starts fresh with no prior context. Do this first:

1. Read `ai/PLAN.md` — understand goals, scope, architecture, and performance targets.
2. Read `ai/tasks/` directories — `backlog/`, `in-progress/`, `done/`. This is the source of truth for what's been done and what's next.
3. If a task is in `in-progress/`, check `git log` and `git status` to understand where it was left off. Resume it — don't restart from scratch.
4. If nothing is in progress, pick the next unblocked task from `backlog/` (check its `Blocked by` field against `done/`).

## How to work on a task

1. Move the task file to `ai/tasks/in-progress/`.
2. Read the task file fully — it has acceptance criteria and edge cases.
3. Read the existing code you'll be modifying before writing anything.
   _Note_ You are WELCOME to challenge the task if you notice something inconsistent or you think it's not the right thing to work on. You should feel empowered to stop and voice your concerns.
4. Implement, commit with descriptive messages explaining _what_ and _why_.
5. Run the quality gate: `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test`
6. If the task touches the playground: `cd apps/playground && npx playwright test`
7. Move the task file to `ai/tasks/done/`.

## When a session ends mid-task

The user may stop you at any point. To make the next session's resume smooth:

- **Commit early and often.** Uncommitted work is lost between sessions.
- **Write descriptive commit messages.** After context is lost, `git log` is the only history.
- If the task isn't finished, leave it in `ai/tasks/in-progress/`. The next session will pick it up via step 3 above.

## Self-improvement

This file is your persistent memory. **You are expected to update it.**

- If the user corrects your behavior — especially more than once — add a rule to the "Learned lessons" section so future sessions don't repeat the mistake.
- If you discover a non-obvious tooling quirk, environment issue, or workflow pitfall during implementation, add it too.
- Keep entries concise and actionable. Write them as instructions to your future self, not as notes about what happened.
- Remove entries that are no longer relevant (e.g., a workaround for a bug that's been fixed).
- If you notice inconsistent instructions.

## Learned lessons

This section is updated as we discover things that affect how work should be done.

- **react-component-benchmark v2.0.0** requires React ^18, incompatible with React 19. Use Vitest bench + renderHook for React performance benchmarks.
- **`pnpm turbo bench`** is configured with `cache: false` — benchmarks must never be cached.
- **Biome v2 config** differs from v1 — no `files.ignore`, uses VCS gitignore instead.
- **pnpm `--filter`** — run commands in a specific package from the repo root: `pnpm --filter @qigrid/react bench`. Never `cd` into sub-packages.
- **Playwright e2e tests** — run from repo root: `pnpm --filter @qigrid/playground e2e`
- **Visual regression baselines** — if the playground UI changes, Playwright screenshot tests will fail. Update baselines with `npx playwright test --update-snapshots` and commit the new baselines.
