# Sandcastle as execution engine, not as framework

We use sandcastle (`@ai-hero/sandcastle`) as a library for worktree isolation and agent lifecycle management, but we do not adopt its per-project distribution model (`.sandcastle/` directory, Dockerfile, `main.mts` in each repo).

Sandcastle's convention is that each project scaffolds its own `.sandcastle/` with a Dockerfile and orchestration script. This makes sense for sandcastle's fully autonomous model, but our workflow has different concerns: Linear as the source of truth, tier-based execution with human review gates, and reusable orchestration logic across projects. Adopting `.sandcastle/` conventions in every project would couple target repos to our tooling.

Instead, the orchestrator lives in creampi as a standalone package that calls sandcastle's programmatic API (`createWorktree()`, `noSandbox()`, `pi()`). Target projects need no sandcastle-specific files. The orchestrator constructs worktrees and agent runs programmatically.

## Considered Options

- **Sandcastle's per-project model** — `.sandcastle/main.mts` in each repo. Rejected: duplicates orchestration logic, couples target projects to sandcastle.
- **Pi SDK directly** — `createAgentSession()` for agent lifecycle. Rejected: would require reimplementing worktree/branch management that sandcastle already handles.
- **Pi subagents only** — no external tooling. Rejected: no long-running process capability, no worktree isolation for parallel writes, sessions don't persist across review cycles.
