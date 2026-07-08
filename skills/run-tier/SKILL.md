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
  maxParallelWorkers: 4
```

`maxParallelWorkers` (default `4`) caps how many workers run at once across a tier, passed through as `globalConcurrencyLimit` on every parallel `subagent()` dispatch. It prevents a large tier from fanning out 6+ model calls simultaneously and hitting provider rate limits.

Only create a new file when neither the project-level nor user-level config exists. When `~/.creampi.yaml` exists, use it directly — do not copy it into the project root.

> **Prerequisite (pi-subagents ≥ 0.33):** set `worktreeBaseDir` in `~/.pi/agent/extensions/subagent/config.json` to a stable trusted directory (e.g. a sibling of your repos). This pins where `worktree: true` creates isolated checkouts, avoiding the temp-dir cases where isolation silently fails and parallel workers race over the shared checkout. Each worker prompt below also independently verifies its own worktree before any git op (belt-and-suspenders).

Read the resolved config. Use these values throughout the run.

### 1. Fetch issues and relations

Call `linear_fetch_issues` with the parent issue ID from `$ARGUMENTS`.

This returns: the parent issue, all child issues (with AFK/HITL classification, current status, and `branchName`), and blocking relations between them.

Each issue's `branchName` field contains the Linear-generated branch name (e.g. `eng-608-drop-redundant-current_version-from-agentdetail-response`). This is used in step 5 to name worktree branches so Linear's GitHub integration auto-links PRs to issues.

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
  async: true,
  globalConcurrencyLimit: {maxParallelWorkers}   // from workflow.maxParallelWorkers (default 4)
})
```

Before dispatching, call `linear_update_status` to set each issue to "In Progress".

After dispatching, block on the batch before continuing to review/PRs:

```typescript
wait({ all: true })
```

`wait({ all: true })` returns when every async worker in the batch finishes **or needs attention** (a worker that went idle or blocked). Do not use sleep/status-polling loops. This is what keeps `/run-tier` correct in non-interactive `pi -p` runs — without it the turn can end while workers are still running. If `wait` reports a run needs attention, inspect it (see "Monitoring & recovery" below) before proceeding.

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

0. Verify worktree isolation BEFORE any git op: confirm `pwd` and `git rev-parse --show-toplevel` both point at your assigned worktree directory, not a shared checkout. If they do not match, stop and report — do not edit or commit.
1. Rename the worktree branch to the Linear convention: `git checkout -b {branch-name}`
   (`{branch-name}` is the `branchName` field from the Linear issue response)
2. Read the coding standards file
3. Explore the codebase to understand current state
4. RED: write one failing test for the next behavior
5. GREEN: write minimal code to pass
6. Repeat until acceptance criteria are met
7. REFACTOR: deepen modules, extract duplication — only while GREEN

Run tests before committing. Commit with message prefix '{issue-id}:'.
After committing, push the branch to origin: `git push -u origin HEAD`.
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

Judge the diff against the coding standards at {path-to-CODING_STANDARDS.md} — the same file the worker followed. Inspect the changed files directly. Return concise, evidence-backed findings with file/line references. Categorize each finding as:
- 🛑 Blocker — must fix before merge
- ⚠️ Fix worth doing now — should fix, not a blocker
- 💡 Optional — nice to have, can defer

Do not edit files. Do not run subagents.`,
  context: "fresh",
  async: true
})
```

Then block on the reviewer(s):

```typescript
wait({ all: true })
```

#### 6b. Synthesize findings

After the reviewer completes, assess the findings:

- If there are **no blockers or fixes worth doing now** → review is clean, proceed to step 7
- If there are **blockers or fixes worth doing now** → dispatch a fix worker (step 6c)
- **Optional/deferred findings** → note them in the tier summary but do not fix

#### 6c. Dispatch fix workers

If reviewers found issues worth fixing, dispatch fix workers for all affected branches in parallel using worktree isolation (same pattern as step 5):

```typescript
subagent({
  tasks: [
    { agent: "worker", task: `Apply the reviewer's accepted fixes on branch {branch} for issue {issue-id}.

Reviewer findings:
{synthesized findings — blockers and fixes worth doing now only}

Apply only the fixes listed above. Do not expand scope. Run tests after fixing. Commit with message prefix '{issue-id}: review fixes'.` },
    // ... one per branch that needs fixes
  ],
  worktree: true,
  async: true,
  globalConcurrencyLimit: {maxParallelWorkers}
})
```

Then block on the fix workers:

```typescript
wait({ all: true })
```

**Important:** Always use `worktree: true` when dispatching multiple fix workers in parallel. Without worktree isolation, parallel workers race over `git checkout` in the same directory, causing commits on wrong branches or lost work. Fix workers must perform the same step-0 worktree verification (`pwd` + `git rev-parse --show-toplevel`) as the initial workers before any git op.

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

1. Assemble a PR body from context you already hold — the Linear issue (step 5), the worker's diff/commits, the reviewer findings (step 6), and CI intent. Do not fetch anything new. Use this structure:

   ```markdown
   ## Why
   {issue description — 1-2 sentences of intent}

   ## What changed
   {3-6 bullets: the actual edits, derived from the diff/commits}

   ## Testing
   {tests added/changed + how they were run}

   ## Reviewer notes
   {reviewer's deferred/optional findings from step 6, or "Clean review after N round(s)"}

   <!-- creampi: tier={N} issue={issue-id} reviewed={true|false} -->
   ```

   Keep it tight — a reviewer skims Why, then reads What changed against the diff. The HTML comment is machine provenance only; `Closes {issue-id}` is appended by `open_pr`, do not add it yourself.

2. Call `open_pr` with the issue's Linear branch name (not the worktree-generated name), the issue ID, the issue title, and the assembled `body`
3. Call `linear_update_status` to set the issue to "In Review"

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

## Monitoring & recovery

When `wait` reports a run finished with a failure or needs attention, inspect and recover before proceeding — do not silently re-dispatch.

**Inspect what workers are doing:**

```typescript
subagent({ action: "status", view: "fleet" })                 // read-only overview of all active workers
subagent({ action: "status", view: "transcript", id: "<run>" }) // tail one worker's output/session
```

Each child also leaves a durable `<run>_<agent>_transcript.jsonl` artifact, so a post-mortem is one file per worker instead of manual git/log spelunking.

**Nudge a live worker instead of killing it:** if a worker is still running but off track (wrong branch, wrong file, over-broad scope), steer it rather than interrupt-and-re-dispatch:

```typescript
subagent({ action: "steer", id: "<run>", message: "You are on the wrong branch. Checkout {branch-name} before committing." })
```

Steer only works while the worker is alive. If a worker has already died (e.g. a transient `Connection error`), check whether any commits landed (`git log main..{branch}`) before re-dispatching, and prune any dangling worktrees + delete empty branches between attempts.

## Error handling

- If `linear_fetch_issues` fails, report the error and stop.
- If `compute_tiers` detects a cycle, report the involved issues and stop.
- If a worker fails or times out, report it but continue with other workers in the tier. Still open PRs for workers that succeeded.
- If `open_pr` or `check_ci` fails for one PR, report it and continue with others.
- Never silently skip errors. Always tell the developer what happened.
