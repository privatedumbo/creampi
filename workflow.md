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

### Phase 2: Execution (in the same pi session)

```
pi> /run-tier ENG-42
```

The agent:

1. Calls `linear_fetch_issues` to get children and blocking relations
2. Calls `compute_tiers` to get deterministic tier ordering
3. Identifies the current tier (first tier with unfinished issues)
4. For HITL slices: surfaces them, pauses for developer input
5. For AFK slices: dispatches parallel workers via `subagent()` with `worktree: true`
6. After workers complete: calls `open_pr` for each
7. Calls `check_ci` to verify PRs pass
8. Notifies developer: "Tier N complete, PRs ready for review"
9. Stops and waits

Developer reviews PRs, merges, then:

```
pi> /run-tier ENG-42
```

Agent re-reads Linear, computes next tier, repeats.

## Architecture

100% pi-native (ADR-0004). Distributed as a pi package.

```
creampi/
├── skills/
│   └── run-tier/SKILL.md     ← orchestration flow instructions
├── prompts/
│   └── run-tier.md           ← slash command template
├── extensions/
│   └── creampi/
│       ├── index.ts           ← registers tools
│       ├── linear-client.ts   ← tested module → tool
│       ├── tier-computer.ts   ← tested module → tool
│       ├── pr-manager.ts      ← tested module → tool
│       └── types.ts
├── CONTEXT.md
├── docs/adr/
└── package.json               ← pi package manifest
```

Installed with:
```bash
pi install git:github.com/fbocci/creampi
```

## Key Decisions

- **Pi-native architecture** — see ADR-0004 (supersedes ADR-0001)
- **Worktrees without Docker** — see ADR-0002
- **Linear as state machine** — see ADR-0003
- **`/to-issues` must set Linear native blocking relations** — ENG-374
