# Creampi Workflow

## Task Classification

When work arrives, the developer describes it to pi. Pi asks whether it warrants the full pipeline or can be knocked out directly. The developer confirms.

- **Ad-hoc Task** → straight to implementation
- **Hard Feature** → full pipeline below

## Hard Feature Pipeline

### Phase 1: Design (interactive, in pi)

1. **Grill** (`/grill-with-docs`) — challenge the plan, resolve terminology, update CONTEXT.md, create ADRs
2. **PRD** (`/to-prd`) — synthesize from the conversation context, publish as parent Linear issue. References ADRs. Includes implementation decisions, testing decisions, user stories.
3. **Issues** (`/to-issues`) — break PRD into vertical slices (tracer bullets). Each is AFK or HITL. Dependencies set as Linear native blocking relations. Published as child issues of the PRD parent.

### Phase 2: Execution (long-running orchestrator)

```bash
creampi run ENG-42
```

The orchestrator:

1. Reads parent issue and all children from Linear
2. Queries native blocking relations
3. Computes tiers (groups of issues whose blockers are all resolved)
4. For each tier:
   - Surfaces HITL slices → notifies developer, pauses
   - Dispatches AFK slices → parallel pi agents, each in its own git worktree
   - Each agent: implements issue → pushes branch → CI runs
   - On CI green: opens PR (stacked within tier if needed)
   - Notifies developer: "Tier N complete, PRs ready for review"
   - Waits for developer to merge
5. After merge: re-reads Linear, computes next tier, repeats

### What the developer does during execution

- Reviews PRs at tier boundaries
- Resolves HITL issues when notified
- Can walk away between tiers — orchestrator waits

## Repo Structure

```
creampi/
├── skills/              ← pi skills (symlinked to ~/.agents/skills/)
├── extensions/          ← pi extensions
├── packages/
│   └── orchestrator/    ← TypeScript project (sandcastle + Linear)
├── CONTEXT.md
├── docs/adr/
└── package.json
```

## Orchestrator Config

```yaml
# .creampi/config.yaml

linear:
  workspace: "beyond-data-consulting"
  team: "Engineering"

models:
  worker: "anthropic/claude-sonnet-4"
  reviewer: "anthropic/claude-opus-4"

workflow:
  review: true
  max-review-rounds: 2

sandbox:
  dockerfile: null       # null = no sandbox (worktrees only)

branches:
  pattern: "feature/{{issue-id}}-{{slug}}"

notify:
  on-tier-complete: true
```

## Key Decisions

- **Sandcastle as library, not framework** — see ADR-0001
- **Worktrees without Docker** — see ADR-0002
- **Linear as state machine** — see ADR-0003
- **`/to-issues` must set Linear native blocking relations** — upstream PR or local wrapper TBD
