---
name: run-tier
description: Execute the next unblocked tier of a Linear parent issue's dependency graph. Dispatches parallel AFK agents in worktrees, surfaces HITL issues, opens PRs, checks CI, and stops at the tier boundary for review.
argument-hint: "<parent-issue-id>"
---

# Run Tier

Execute the next unblocked **Tier** from a parent Linear issue's dependency graph. Each invocation processes exactly one tier, then stops at the **Tier Boundary** for developer review.

## Vocabulary

Use these terms precisely (see CONTEXT.md):

- **Tier** — a group of issues whose blockers are all resolved; they execute in parallel
- **AFK Slice** — an issue agents can implement autonomously
- **HITL Slice** — an issue requiring human input; pauses the pipeline
- **Tier Boundary** — the review gate between tiers where the developer reviews and merges

## Process

### 1. Fetch issues and relations

Call `linear_fetch_issues` with the parent issue ID from `$ARGUMENTS`.

This returns: the parent issue, all child issues (with AFK/HITL classification and current status), and blocking relations between them.

### 2. Compute tiers

Call `compute_tiers` with the `children` and `relations` returned from step 1.

This returns a deterministic tier ordering computed via topological sort. Issues whose blockers are already Done are treated as unblocked. Do not attempt to compute tiers manually — always use the tool.

### 3. Identify the current tier

Find the first tier where not all issues are Done. This is the current tier. Report:

```
Tier {N}/{total}: {count} AFK slices, {count} HITL slices
```

If all tiers are complete, report "All tiers complete — nothing to do" and stop.

### 4. Handle HITL slices

If the current tier contains **HITL Slices**, list each one with its title and description. Explain what decision or input is needed. Ask the developer to resolve them before proceeding.

Do not dispatch AFK slices until the developer confirms all HITL slices in the tier are resolved. Once resolved, call `linear_update_status` to mark each HITL issue as Done, then continue to step 5.

### 5. Dispatch AFK slices

For each AFK Slice in the current tier that is not already Done or In Progress, dispatch a parallel worker using `subagent()`:

```typescript
subagent({
  tasks: [
    { agent: "worker", task: "<worker prompt for issue 1>" },
    { agent: "worker", task: "<worker prompt for issue 2>" },
    // ... one per AFK slice
  ],
  worktree: true,
  async: true
})
```

Before dispatching, call `linear_update_status` to set each issue to "In Progress".

#### Worker prompt

Each worker task prompt must include:

```
Implement {issue-id}: {issue-title}

## What to build

{issue description from Linear}

## Acceptance criteria

{acceptance criteria from the issue}

## Project context

- Read CONTEXT.md for domain vocabulary
- Read docs/adr/ for architectural decisions
- Read AGENTS.md if it exists for project conventions

## Process

Use TDD (red-green-refactor). One test at a time — do not write all tests first.

1. Explore the codebase to understand current state
2. RED: write one failing test for the next behavior
3. GREEN: write minimal code to pass
4. Repeat until acceptance criteria are met
5. REFACTOR: clean up while all tests pass

Run tests before committing. Commit with message prefix '{issue-id}:'.
```

### 6. Open PRs

After all workers complete, for each worker that produced commits:

1. Call `open_pr` with the worker's branch name, the issue ID, and the issue title
2. Call `linear_update_status` to set the issue to "In Review"

If a worker produced no commits or failed, report it but continue with the other workers.

### 7. Check CI

For each opened PR, call `check_ci` with the PR number. Report the results:

- ✅ PR #{N} ({issue-id}): CI passing
- ❌ PR #{N} ({issue-id}): CI failing — {details}

### 8. Announce tier boundary

Report the tier completion summary:

```
🏁 Tier {N}/{total} complete

PRs ready for review:
- PR #{N}: {issue-title} (CI: ✅/❌)
- PR #{N}: {issue-title} (CI: ✅/❌)

Next steps:
1. Review and merge the PRs above
2. Run /run-tier {parent-issue-id} to start the next tier
```

### 9. Stop

**Do not proceed to the next tier.** The developer will review PRs, merge them, and re-invoke `/run-tier`. This is the **Tier Boundary** — the natural checkpoint where human judgment enters the pipeline.

Linear is the state machine (ADR-0003). The next invocation of `/run-tier` will re-read Linear and pick up the new state.

## Error handling

- If `linear_fetch_issues` fails, report the error and stop.
- If `compute_tiers` detects a cycle, report the involved issues and stop.
- If a worker fails or times out, report it but continue with other workers in the tier. Still open PRs for workers that succeeded.
- If `open_pr` or `check_ci` fails for one PR, report it and continue with others.
- Never silently skip errors. Always tell the developer what happened.
