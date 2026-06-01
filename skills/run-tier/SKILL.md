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

### 0. Resolve config

Locate `.creampi.yaml` using this fallback hierarchy (first match wins):

1. **Project root** — `.creampi.yaml` in the current working directory
2. **Home directory** — `~/.creampi.yaml`
3. **Hardcoded defaults** — if neither file exists, create `.creampi.yaml` in the project root with these defaults:

```yaml
models:
  worker: "anthropic/claude-sonnet-4"
  reviewer: "anthropic/claude-opus-4"

workflow:
  review: true
  maxReviewRounds: 2
```

Only create a new file when neither the project-level nor user-level config exists. When `~/.creampi.yaml` exists, use it directly — do not copy it into the project root.

Read the resolved config. Use these values throughout the run.

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

## Coding standards

Read the coding standards file at {path-to-CODING_STANDARDS.md} before writing any code. Follow them strictly:

- Use TDD with vertical slices (red-green-refactor, one test at a time)
- Tests verify behavior through public interfaces, not implementation details
- Mock only at system boundaries, never your own modules
- Prefer deep modules: small interface, deep implementation
- Design for testability: accept dependencies, return results, small surface area

## Process

1. Read the coding standards file
2. Explore the codebase to understand current state
3. RED: write one failing test for the next behavior
4. GREEN: write minimal code to pass
5. Repeat until acceptance criteria are met
6. REFACTOR: deepen modules, extract duplication — only while GREEN

Run tests before committing. Commit with message prefix '{issue-id}:'.
```

`{path-to-CODING_STANDARDS.md}` is the absolute path to `CODING_STANDARDS.md` in the run-tier skill directory (sibling of this `SKILL.md`).

### 6. Review workers (optional)

**Skip this step entirely if `workflow.review` is `false` in `.creampi.yaml` (or if no config exists and the default is used — check the config first).** When `workflow.review` is `true`, review each worker's output before opening PRs.

Read `.creampi.yaml` to determine `workflow.review` (default: `true`) and `workflow.maxReviewRounds` (default: `2`). Also read `models.reviewer` for the reviewer model.

For each worker that produced commits, run a review loop on that worker's branch:

#### 6a. Dispatch reviewer

Launch a fresh-context reviewer to inspect the worker's diff. The reviewer must not edit files — it returns findings only.

```typescript
subagent({
  agent: "reviewer",
  task: `Review the current diff on branch {branch} for issue {issue-id}: {issue-title}.

Inspect the changed files directly. Return concise, evidence-backed findings with file/line references. Categorize each finding as:
- 🛑 Blocker — must fix before merge
- ⚠️ Fix worth doing now — should fix, not a blocker
- 💡 Optional — nice to have, can defer

Do not edit files. Do not run subagents.`,
  context: "fresh",
  async: true
})
```

#### 6b. Synthesize findings

After the reviewer completes, assess the findings:

- If there are **no blockers or fixes worth doing now** → review is clean, proceed to step 7
- If there are **blockers or fixes worth doing now** → dispatch a fix worker (step 6c)
- **Optional/deferred findings** → note them in the tier summary but do not fix

#### 6c. Dispatch fix worker

If the reviewer found issues worth fixing, dispatch a forked-context worker on the same branch:

```typescript
subagent({
  agent: "worker",
  task: `Apply the reviewer's accepted fixes on branch {branch} for issue {issue-id}.

Reviewer findings:
{synthesized findings — blockers and fixes worth doing now only}

Apply only the fixes listed above. Do not expand scope. Run tests after fixing. Commit with message prefix '{issue-id}: review fixes'.`,
  async: true
})
```

#### 6d. Repeat or stop

After the fix worker completes, increment the review round counter. Then:

- If **round < `workflow.maxReviewRounds`** → go back to step 6a (dispatch another reviewer)
- If **round >= `workflow.maxReviewRounds`** → stop the review loop, proceed to step 7. Report any remaining unresolved findings in the tier summary.

Report review progress to the developer:

```
🔍 Review round {N}/{max} for {issue-id}:
  - {count} blockers, {count} fixes applied, {count} optional deferred
```

When the review loop completes cleanly (no remaining blockers), report:

```
✅ {issue-id}: Review clean after {N} round(s)
```

### 7. Open PRs

After all workers complete (and reviews pass, if enabled), for each worker that produced commits:

1. Call `open_pr` with the worker's branch name, the issue ID, and the issue title
2. Call `linear_update_status` to set the issue to "In Review"

If a worker produced no commits or failed, report it but continue with the other workers.

### 8. Check CI

For each opened PR, call `check_ci` with the PR number. Report the results:

- ✅ PR #{N} ({issue-id}): CI passing
- ❌ PR #{N} ({issue-id}): CI failing — {details}

### 9. Announce tier boundary

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

### 10. Stop

**Do not proceed to the next tier.** The developer will review PRs, merge them, and re-invoke `/run-tier`. This is the **Tier Boundary** — the natural checkpoint where human judgment enters the pipeline.

Linear is the state machine (ADR-0003). The next invocation of `/run-tier` will re-read Linear and pick up the new state.

## Error handling

- If `linear_fetch_issues` fails, report the error and stop.
- If `compute_tiers` detects a cycle, report the involved issues and stop.
- If a worker fails or times out, report it but continue with other workers in the tier. Still open PRs for workers that succeeded.
- If `open_pr` or `check_ci` fails for one PR, report it and continue with others.
- Never silently skip errors. Always tell the developer what happened.
