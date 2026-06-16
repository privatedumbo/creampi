---
name: to-epic
description: Use when the user wants to create an Epic — a time-bound body of work with an owner, target date, and multiple child issues. Grills the user until the Epic contract is fully satisfied before creating anything. Triggers on "create an epic", "new epic", "to-epic", or when the user describes a goal that should be tracked as an Epic.
---

# To Epic

Turn a goal into a well-formed Epic by grilling the user until the contract is satisfied, then create it in the issue tracker.

## The Epic contract

An Epic is NOT a container, a parking lot, or a "broad bucket that evolves." An Epic is a **commitment** — a time-bound body of work with clear accountability. Every Epic must satisfy this contract before creation:

| Field | Required | What "good" looks like |
|-------|----------|----------------------|
| **Goal** | Yes | What's done when it's done? Clear, verifiable end state. |
| **Why** | Yes | What does this enable or unblock? Why now? |
| **Owner** | Yes | One person accountable. Not "TBD" or "unassigned." Set as the Linear assignee. |
| **Target date** | Yes | May be provisional — but must exist. "We'll figure it out later" is not acceptable. Set as the Linear due date. |
| **Scope** | Yes | What's included and what's explicitly excluded — the boundary, not the breakdown. |
| **Multiple issues** | Yes | If it doesn't break into multiple issues, it's not an Epic — it's just an Issue. |

### What is NOT an Epic

- A single task disguised as a goal ("add categorical columns to stones")
- An open-ended effort with no target date ("refactoring")
- A vague bucket with no clear done state ("improve quality")
- Anything without an owner

**If the request fails any of these checks, do not create it. Push back.**

## Your job is to add friction, not remove it

Most skills optimize for speed — "bias toward action," "don't block with questions." This skill is the opposite. **The grill IS the value.** A poorly-defined Epic wastes more time than the 2 minutes it takes to define it properly.

Do not rationalize away missing fields:
- "Epics evolve" → No. The contract is set before creation. Scope can change; the contract fields cannot be empty.
- "Dates can be added later" → No. A commitment without a date is not a commitment.
- "Assignee not specified, leave blank" → No. An Epic without an owner has no accountability.
- "The user said not to worry about it" → Still no. Acknowledge their preference, explain why the field matters, and ask for even a rough answer.

## Setup

Read configuration from `docs/agents/`:

- `docs/agents/issue-tracker.md` — tracker type, team, project
- `docs/agents/labels.md` — the `epic` label name
- `docs/agents/ways-of-working.md` — Epic/Issue model confirmation

If `docs/agents/` does not exist, tell the user to run `/setup-privatedumbo-skills` first.

## Process

### 1. Listen to the request

The user will describe what they want. It might be well-formed ("Create an epic for improving the core retriever — Matheus owns it, target June 19th, because it enables external APIs") or vague ("Create an epic for refactoring").

### 2. Challenge scope — is this actually an Epic?

Before anything else, ask yourself: **does this break into multiple issues?**

- If it's a single task ("add a column," "fix a bug," "update a dependency") → tell the user this is an Issue, not an Epic. Offer to create it as a regular issue instead.
- If it's genuinely multi-issue ("improve the core retriever" involves refactoring 2 packages, adding 2 endpoints, and replacing a third) → proceed.
- If you're not sure → ask: "Can you help me understand the scope? What are the pieces of work inside this?"

### 3. Grill for the contract

Walk through each required field. For each one that's missing or vague, ask a specific question. Do not batch all questions at once — go one at a time so the conversation feels natural, not like a form.

**Goal** — If the user gave a vague goal, sharpen it:
- ❌ "Improve Intel Base results" → ✅ "What specifically is better when this is done? Faster search? More relevant results? New data sources?"

**Why** — If no "why" was stated, ask:
- "What does this enable or unblock? Why is this the right thing to work on now?"

**Owner** — If no owner was mentioned, ask:
- "Who owns this? One person who's accountable for it landing."

**Target date** — If no date was given, or the user explicitly deferred it:
- "I know dates are uncertain, but what's a rough target — even provisional? We can adjust it, but we need one to commit to."
- If the user pushes back hard, accept a provisional date and note it as such. Never accept "no date."

**Scope** — Once you have the goal, ask about boundaries:
- "What's included and what's explicitly out of scope? I don't need a work breakdown — just where this stops."
- Do NOT list expected child issues or count them. The child issues carry the breakdown and evolve independently.

### 4. Summarize and confirm

Before creating, present the complete Epic:

```
Epic: Improve Core Retriever
Owner: Matheus (assignee)
Target: June 19, 2026 (due date)
Goal:  Domain-owned retrieval with dedicated search endpoints
Why:   Enables external API consumers + Overwatch integration
Scope: Covers retrieval refactoring and new search endpoints.
       Does not include agent tooling or UI changes.
```

Ask: "Does this look right? Should I create it?"

### 5. Create

Create a parent issue in the issue tracker:
- **Title**: the goal, concise, imperative, no `[Epic]` prefix (the label handles that)
- **Description**: structured with Goal, Why, and Scope sections (Owner and Target date are Linear fields, not description sections)
- **Label**: `epic` (from `docs/agents/labels.md`)
- **Assignee**: the owner
- **Due date**: the target date
- **Project**: from `docs/agents/issue-tracker.md`
- **Team**: from `docs/agents/issue-tracker.md`

### 6. Report

Show the user what was created: identifier, URL, and a reminder that the next step is `/to-prd` or `/to-issues` to break it down.

## Epic description template

```markdown
## Goal

<What's done when this is done? Clear, verifiable end state.>

## Why

<What does this enable or unblock? Why now?>

## Scope

<What's included and what's explicitly excluded — the boundary, not the breakdown. Do not list or count child issues.>
```

## What NOT to do

- Do NOT create an Epic with missing contract fields, even if the user asks you to skip them.
- Do NOT prefix the title with `[Epic]` — the label handles categorization.
- Do NOT write a lengthy description with user stories, implementation details, or acceptance criteria. That's what `/to-prd` is for. The Epic description is a commitment, not a spec.
- Do NOT create child issues. That's what `/to-issues` is for. Just create the Epic.
