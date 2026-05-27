# Creampi Orchestrator — Progress

## Completed

### ENG-364: Project scaffolding, config loader, and distributable CLI ✅
- `packages/orchestrator/` with TypeScript, tsup, vitest
- Config loader with deep merge and typed defaults
- CLI entry point: `creampi run <issue-id>`
- Distributable via `npm install -g .`
- 4 tests passing

### ENG-365: LinearClient ✅
- LinearClient class with dependency-injected LinearApi
- getParentIssue, getChildIssues (AFK/HITL from labels), getBlockingRelations, updateStatus
- createLinearCliApi: concrete implementation wrapping linear-cli
- Shared types.ts consolidated with tier-computer
- Set up native blocking relations + parent hierarchy in Linear
- 6 tests passing

### ENG-366: TierComputer ✅ (from parallel worker)
- computeTiers(issues, relations) → Tier[]
- Topological sort, cycle detection, Done-blocker handling
- 6 tests passing

## In Progress

### ENG-368: PRManager
- Not yet started

## Remaining (blocked)

- ENG-367: Orchestrator loop (blocked by ENG-365 ✅, ENG-366 ✅) → **UNBLOCKED**
- ENG-369: End-to-end wiring (blocked by ENG-367, ENG-368)
- ENG-370: Agent review step (blocked by ENG-369)
