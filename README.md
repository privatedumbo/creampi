# creampi

Tier-based parallel agent execution from Linear issues. A [pi](https://github.com/anthropics/pi) package.

## Install

```bash
pi install git:github.com/privatedumbo/creampi
```

Requires:
- `LINEAR_API_KEY` environment variable
- `gh` CLI authenticated (for PRs and CI checks)

## Usage

Design phase (interactive):
```
/grill-with-docs  → stress-test plan, update CONTEXT.md + ADRs
/to-prd           → publish PRD as parent Linear issue
/to-issues        → break into AFK/HITL slices with blocking relations
```

Execution phase:
```
/run-tier PROJ-42
```

Reads Linear, computes tiers from the dependency graph, dispatches parallel agents in worktrees for AFK slices, pauses for HITL slices, opens PRs, checks CI, stops at the tier boundary for review. Re-run after merging to continue.

## Configure

On first `/run-tier` invocation, a `.creampi.yaml` is created in your project root with defaults:

```yaml
models:
  worker: "anthropic/claude-sonnet-4"    # model for AFK agents
  reviewer: "anthropic/claude-opus-4"    # model for review pass

workflow:
  review: true          # review worker output before opening PRs
  maxReviewRounds: 2    # max review iterations per worker
```

Edit to customize. The file is `.gitignore`d — it's per-developer, not per-project.
