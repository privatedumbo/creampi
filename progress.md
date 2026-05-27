# Progress

## ENG-371: Extension scaffolding — wrap existing modules as pi tools

**Status: Complete**

### What was done
- Created `extensions/creampi/index.ts` — pi extension that registers 6 custom tools:
  - `linear_fetch_issues` — fetches parent issue children + blocking relations from Linear
  - `compute_tiers` — deterministic topological sort of issues into execution tiers
  - `open_pr` — opens a PR via `gh` referencing a Linear issue
  - `check_ci` — polls CI status for a PR
  - `check_merges` — checks if a PR has been merged
  - `linear_update_status` — updates Linear issue workflow status
- Moved tests to `extensions/creampi/test/` — 12 tests passing (LinearClient: 6, TierComputer: 6)
- All tools use `typebox` schemas for typed parameters
- Tools backed by tested modules: LinearClient, TierComputer, PRManager

### Files changed
- `extensions/creampi/index.ts` (new)
- `extensions/creampi/.gitignore` (new)
- `extensions/creampi/test/linear-client.test.ts` (new)
- `extensions/creampi/test/tier-computer.test.ts` (new)

### Notes
- The other parallel worker (ENG-374) created the same module files (types.ts, linear-client.ts, etc.) — they were identical, no conflicts.
- Module source files were already committed by ENG-374 worker.
