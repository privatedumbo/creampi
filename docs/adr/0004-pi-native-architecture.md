# Pi-native architecture: extension + skill, no external orchestrator

We build the orchestrator as a pi extension with custom tools and a skill, not as a standalone CLI process. Sandcastle is dropped entirely.

During implementation of the original design, we discovered that pi-subagents already provides worktree isolation (`worktree: true`) and parallel agent dispatch — the only capabilities we were using from sandcastle. The remaining orchestration logic (read Linear, compute tiers, open PRs, poll CI) maps naturally to pi extension tools. The agent itself handles the orchestration flow using its native `subagent()` tool for parallel dispatch, guided by a skill.

This eliminates a standalone process, the sandcastle dependency, and the "long-running process" problem entirely. The developer invokes `/run-tier ENG-XX` inside their pi session. The agent reads Linear via custom tools (backed by tested TypeScript), dispatches workers, opens PRs, and pauses for review. The developer reviews, merges, and runs `/run-tier` again.

## Considered Options

- **Standalone CLI with sandcastle** — a separate TypeScript process using sandcastle's `createWorktree()` and `pi()` provider. Rejected: sandcastle's only value was worktree management, which pi-subagents already handles. Added unnecessary dependency and process management complexity.
- **Standalone CLI with Pi SDK** — `createAgentSession()` for programmatic agent spawning. Rejected: same process management issues, and reimplements dispatch logic pi already has.
- **Pure extension command (no LLM in loop)** — extension handler does everything, sends `sendUserMessage()` to trigger subagent dispatch. Rejected: indirect hop through the LLM for subagent calls; fragile.
- **Extension + skill with custom tools** — (chosen) tested TypeScript modules exposed as tools, agent orchestrates natively. Simplest, fully pi-native, distributed as one package.
