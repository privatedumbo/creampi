---
name: setup-privatedumbo-skills
description: Configure per-repo context for Privatedumbo skills — issue tracker, labels, ways of working, and reporting. Run before first use of to-epic, to-prd, to-issues, to-briefing, or if those skills appear to be missing context.
disable-model-invocation: true
---

# Setup Privatedumbo Skills

Scaffold the per-repo configuration that the Privatedumbo Engineering skills assume.

This is a prompt-driven skill, not a deterministic script. **Ask, don't infer.** Don't guess the team from git remotes. Don't parse repo names. Walk through each section one at a time — present, ask, confirm, write.

Be agnostic to tooling. Don't assume MCP, pi, Claude Code, or any specific tool. Write config files that any tool can read.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `AGENTS.md` and `CLAUDE.md` at the repo root — does either exist? Is there already an `## Agent skills` section?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any nested `docs/adr/` directories
- `docs/agents/` — does this skill's prior output already exist?

Present a brief summary of what you found.

### 2. Walk through sections

Present each section one at a time. Explain what it is and why the skills need it. Get the user's answer before moving to the next section.

---

**Section A — Issue tracker & project**

> The engineering skills (to-epic, to-prd, to-issues, to-briefing) need to know where issues live and how to create them. This configures which tracker, team, and project to use.

Ask:

1. **Which issue tracker do you use?** Options: Linear, GitHub Issues, GitLab Issues, Local markdown, Other. Default: Linear.
2. **Which team?** List available teams from the workspace. Let the user pick. Do not assume or default.
3. **Which project?** List available projects. Let the user pick. Do not assume or default.

---

**Section B — Labels**

> Skills auto-apply labels when creating issues. This configures the label vocabulary so the right labels exist and are used consistently.

Present the default label vocabulary and ask the user to confirm or modify:

**Type labels** (applied based on issue type):
- `feature` — new capability
- `bug` — defect
- `chore` — maintenance, cleanup, refactoring
- `ui` — visual / frontend change
- `refinement` — needs further design before implementation

**Workflow labels** (applied based on workflow state):
- `epic` — marks parent issues as Epics (see Ways of Working)
- `ready-for-agent` — issue can be picked up by an AFK coding agent

Ask:
- Are these correct? Any to add, remove, or rename?
- Any additional labels you use? (e.g., client labels, priority labels)

---

**Section C — Ways of working**

> The skills use a shared vocabulary for how work is organized. This configures whether this repo follows the Epic/Issue model and where domain documentation lives.

1. Check if a `CONTEXT.md` already exists in this repo. If yes, show the user what's there.

2. Present the Epic/Issue vocabulary:

   > **Epic**: A time-bound body of work with an owner, a target date, and multiple child issues. Epics are the unit of planning and reporting between engineering and stakeholders. In Linear, an Epic is a parent issue labeled `epic`. An Epic must have: a clear goal, a why, an owner, and a target date. An Epic must not be: a single issue disguised as a goal, open-ended, or unowned.
   >
   > **Issue**: A concrete unit of work that one person can complete. Issues may be standalone or children of an Epic. Sub-issues are just Issues with a parent.
   >
   > **Principle**: Engineering and stakeholders communicate at the Epic level. Stakeholders define goals (what and why); engineering breaks them into Issues (how). Status reporting is always at the Epic level.

3. Ask: Does this repo follow the Epic/Issue model? (yes / no / modified)
   - If modified, ask what's different and note it.

4. Ask: Where do domain docs live?
   - Single `CONTEXT.md` at root + `docs/adr/`
   - Multi-context (`CONTEXT-MAP.md` at root)
   - None yet (that's fine — skills will create them lazily)

---

**Section D — Reporting**

> The `/to-briefing` skill generates status updates for stakeholders. This configures where those updates are posted.

Ask:

1. **Do you report status for this project to stakeholders?** (yes / no)
2. If yes: **Which Initiative does this project belong to?** List available Initiatives from the workspace. Let the user pick. Do not assume.
3. If no: skip this section. `/to-briefing` will note that reporting is not configured.

### 3. Draft output

Before writing any files, show the user the complete output:

- The `docs/agents/` files that will be created
- The `## Agent skills` block that will be added to `CLAUDE.md` or `AGENTS.md`

Ask the user to confirm before writing.

### 4. Write

Create the following files:

**`docs/agents/issue-tracker.md`**

```markdown
# Issue Tracker

- **Tracker:** <Linear | GitHub | GitLab | Local | Other>
- **Team:** <team name> (key: <team key>)
- **Project:** <project name>
- **Project ID:** <project id>
```

**`docs/agents/labels.md`**

```markdown
# Labels

## Type labels

| Label | Applied when |
|-------|-------------|
| `feature` | New capability |
| `bug` | Defect |
| `chore` | Maintenance, cleanup, refactoring |
| `ui` | Visual / frontend change |
| `refinement` | Needs further design |

## Workflow labels

| Label | Applied when |
|-------|-------------|
| `epic` | Parent issue representing an Epic |
| `ready-for-agent` | Issue ready for AFK coding agent |

## Additional labels

<any additional labels the user specified, or "None">
```

**`docs/agents/ways-of-working.md`**

```markdown
# Ways of Working

## Epic/Issue model

<"Enabled" or "Not used" or custom notes>

<If enabled, include the Epic contract and communicate-at-epic-level principle>

## Domain documentation

- **Structure:** <single-context | multi-context | none>
- **CONTEXT.md:** <path or "not yet created">
- **ADRs:** <path or "not yet created">
```

**`docs/agents/reporting.md`** (only if reporting is enabled)

```markdown
# Reporting

- **Initiative:** <initiative name>
- **Initiative ID:** <initiative id>
```

**`CLAUDE.md` or `AGENTS.md`** — append an `## Agent skills` section:

Selection rules for which file to edit:
- If `CLAUDE.md` exists, use it
- Else if `AGENTS.md` exists, use it
- Else create `CLAUDE.md`

```markdown
## Agent skills

This repo is configured for the Privatedumbo Engineering skills.
Configuration lives in `docs/agents/`:

- `issue-tracker.md` — tracker, team, project
- `labels.md` — type and workflow labels
- `ways-of-working.md` — Epic/Issue model, domain docs
- `reporting.md` — stakeholder reporting (if configured)

Skills that read this configuration:
- `/to-epic` — create Epics
- `/to-prd` — create PRDs
- `/to-issues` — break down into vertical-slice issues
- `/to-briefing` — generate stakeholder status updates
```

### 5. Confirm

Tell the user the setup is complete and which skills will now read from these files. Mention they can edit `docs/agents/*.md` directly later — re-running this skill is only necessary if they want to change tracker, team, or project.
