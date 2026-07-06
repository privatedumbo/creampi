# creampi owns the worktree config surface; pi-subagents owns the mechanism

creampi resolves the worktree base directory from `.creampi.yaml` and hands it to pi-subagents. It does **not** create, manage, or clean worktrees — that stays with pi-subagents (ADR 0004).

The distinction is between a *configuration surface* and a *mechanism*. ADR 0004 delegates the worktree mechanism (create, isolate, diff, clean) to pi-subagents, and that delegation stands. But "where on disk should isolated checkouts live" is a decision the developer makes, and the developer already configures creampi through `.creampi.yaml`. Forcing them to also hand-edit `~/.pi/agent/extensions/subagent/config.json` to set a base dir leaks pi-subagents' internals into their workflow and splits configuration across two files owned by two layers. A creampi user should configure creampi in one place and never need to know pi-subagents exists.

pi-subagents resolves its worktree base directory as `configuredBaseDir ?? PI_SUBAGENTS_WORKTREE_DIR ?? os.tmpdir()`. `PI_SUBAGENTS_WORKTREE_DIR` is its published override — a supported, stable seam, not an internal. So creampi reads `.creampi.yaml` at extension activation and exports the resolved value as `PI_SUBAGENTS_WORKTREE_DIR`. No file-editing of another extension's config, no changes to the mechanism, no coupling to pi-subagents internals — only its documented env override.

Resolution precedence is `PI_SUBAGENTS_WORKTREE_DIR` (an explicit operator override wins) → `.creampi.yaml` `workflow.worktreeBaseDir` → a built-in default of `~/creampi-worktrees`. The default is under `$HOME`, deliberately **not** the OS temp dir: temp-dir worktrees are the fragile case where isolation silently degrades (cleanup races, tmp reaping), which is the failure this default exists to prevent. Left unconfigured before, pi-subagents fell back to `os.tmpdir()` with no signal — the silent footgun that motivated this ADR.

Visibility is part of the contract. A developer should be able to see which layer resolved what: `run_tier_plan` and `/creampi-doctor` print the resolved base dir and its origin (`env` / `config` / `default`) alongside the models and concurrency that will govern a run, so the layering is legible on demand instead of hidden.

## Considered Options

- **creampi exports `PI_SUBAGENTS_WORKTREE_DIR` from `.creampi.yaml`** — (chosen) one config file owned by creampi, bridged to pi-subagents through its published env override. No internals touched.
- **Developer hand-edits `~/.pi/agent/extensions/subagent/config.json`** — rejected: splits config across two files/two layers, leaks pi-subagents internals into the user's workflow, and this file's `configuredBaseDir` silently shadows any env value, creating two competing sources of truth.
- **creampi manages worktrees itself** — rejected: re-introduces the sandcastle-shaped coupling ADR 0004 removed; reimplements a mechanism pi-subagents already owns.
- **Add `worktreeBaseDir` as a `subagent()` tool parameter** — not available: it is not a tool parameter; the env override is the only per-invocation seam pi-subagents exposes.
