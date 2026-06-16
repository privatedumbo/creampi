---
name: to-issues
description: Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices, with native Linear blocking relations. Use when user wants to convert a plan into issues, create implementation tickets, or break down work into issues.
---

<!--
  Based on https://github.com/mattpocock/skills (skills/engineering/to-issues)
  Original author: Matt Pocock — MIT License
  See THIRD-PARTY-NOTICES.md for the full license text.
  Modifications: added Section 7 (Linear blocking relations for tier orchestration);
  added setup section pointing to docs/agents/ configuration; minor wording tweaks.
-->

# To Issues

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

## Setup

Before first use, run `/setup-privatedumbo-skills` to configure the issue tracker, labels, and project for this repo. The skill reads configuration from `docs/agents/`:

- `docs/agents/issue-tracker.md` — tracker type, team, project
- `docs/agents/labels.md` — triage label vocabulary
- `docs/agents/ways-of-working.md` — Epic/Issue model

If `docs/agents/` does not exist, tell the user to run `/setup-privatedumbo-skills` first.

## Process

### 1. Read configuration

Read `docs/agents/issue-tracker.md` for the tracker, team, and project. Read `docs/agents/labels.md` for the triage label to apply to AFK slices. Read `docs/agents/ways-of-working.md` for the Epic/Issue vocabulary.

### 2. Gather context

Work from whatever is already in the conversation context. If the user passes an issue reference (issue number, URL, or path) as an argument, fetch it from the issue tracker and read its full body and comments.

### 3. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Issue titles and descriptions should use the project's domain glossary vocabulary (check for `CONTEXT.md` and `docs/adr/` — location noted in `docs/agents/ways-of-working.md`), and respect ADRs in the area you're touching.

### 4. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 5. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 6. Publish the issues to the issue tracker

For each approved slice, publish a new issue to the issue tracker using the project and team from `docs/agents/issue-tracker.md`. Apply the triage label from `docs/agents/labels.md` (typically `ready-for-agent` for AFK slices) unless instructed otherwise.

If the source is an Epic (parent issue labeled `epic` per `docs/agents/labels.md`), set `parentId` on every created issue so they appear as children of the Epic.

Publish issues in dependency order (blockers first) so you can reference real issue identifiers in the "Blocked by" field.

<issue-template>
## Parent

A reference to the parent issue on the issue tracker (if the source was an existing issue, otherwise omit this section).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket (if any)

Or "None - can start immediately" if no blockers.

</issue-template>

Do NOT close or modify any parent issue.

### 7. Set native blocking relations

After all issues are published, set native blocking relations for every dependency. The "Blocked by" text in the issue body is for human readers; the native relations are what the orchestrator reads to compute tiers deterministically.

For each issue that has a "Blocked by" reference, create a blocking relation. The blocker issue blocks the dependent issue.

After setting all relations, verify by spot-checking one or two issues to confirm the relations show the expected blocking relationships.
