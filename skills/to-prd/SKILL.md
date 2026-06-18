---
name: to-prd
description: Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
disable-model-invocation: true
---

<!--
  Based on https://github.com/mattpocock/skills (skills/engineering/to-prd)
  Original author: Matt Pocock — MIT License
  See THIRD-PARTY-NOTICES.md for the full license text.
  Modifications: replaced "seams" with "deep modules" language;
  added setup section pointing to docs/agents/ configuration.
-->

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

## Setup

Before first use, run `/setup-privatedumbo-skills` to configure the issue tracker, labels, and project for this repo. The skill reads configuration from `docs/agents/`:

- `docs/agents/issue-tracker.md` — tracker type, team, project
- `docs/agents/labels.md` — triage label vocabulary
- `docs/agents/ways-of-working.md` — Epic/Issue model

If `docs/agents/` does not exist, tell the user to run `/setup-privatedumbo-skills` first.

## Process

1. **Read configuration.** Read `docs/agents/issue-tracker.md` for the tracker, team, and project. Read `docs/agents/labels.md` for the triage label. Read `docs/agents/ways-of-working.md` for vocabulary and domain doc locations.

2. **Explore the repo** to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary (check for `CONTEXT.md` and `docs/adr/` — location noted in `docs/agents/ways-of-working.md`), and respect any ADRs in the area you're touching.

3. **Sketch out the major modules** you will need to build or modify to complete the implementation. Actively look for opportunities to extract deep modules that can be tested in isolation.

   A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

   Check with the user that these modules match their expectations. Check with the user which modules they want tests written for.

4. **Write the PRD** using the template below, then publish it to the project issue tracker using the project and team from `docs/agents/issue-tracker.md`. Apply the triage label from `docs/agents/labels.md` (typically `ready-for-agent`) — no need for additional triage.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>
