---
name: to-briefing
description: Use when generating a stakeholder status update. Queries Linear for epic-labeled issues, computes progress, assesses health, and produces a structured Initiative Update or Project Update with a Gantt timeline chart. Triggers on "briefing", "status update", "update for Owen", "to-briefing", or when the user needs to report progress to stakeholders.
---

# To Briefing

Generate a stakeholder briefing by querying Linear for current Epic status, then producing a structured update with a Gantt timeline chart.

## Setup

Read configuration from `docs/agents/`:

- `docs/agents/issue-tracker.md` — tracker type, team, project
- `docs/agents/labels.md` — the `epic` label name
- `docs/agents/reporting.md` — which Initiative this project reports to

If `docs/agents/` does not exist, tell the user to run `/setup-privatedumbo-skills` first.
If `docs/agents/reporting.md` does not exist or reporting is not configured, tell the user and ask if they want to configure it now.

## Modes

The briefing runs in one of two modes depending on what the user asks for:

| Mode | Scope | Chart shows | Posted as |
|---|---|---|---|
| **Per project** | Epics in a single project | One project's Epics | Project Update |
| **Per initiative** | Epics across all projects in the Initiative | All projects' Epics, grouped by project | Initiative Update |

**How to determine the mode:**
- If the user names a specific project (e.g. "briefing for Wisner"), run **per project**.
- If the user asks for an initiative-level briefing, mentions the initiative name, or says "briefing for Owen" / "status update" without naming a project, run **per initiative**.
- If ambiguous, ask.

Both modes follow the same process below. The only differences are:
1. Per-initiative queries all projects under the Initiative; per-project queries one.
2. Per-initiative groups Epics by project in both the markdown briefing and the Gantt chart.
3. Per-initiative posts an Initiative Update; per-project posts a Project Update.

## Principles

**Report at the Epic level.** The briefing shows Epics — not Issues. Never list individual issue titles, identifiers, or implementation details. The stakeholder cares about "what's landing when" and "what's at risk," not "ENG-645 is in review."

**Be honest about health.** Never soften a 🔴 to a 🟡, or a 🟡 to a 🟢. If the user asks you to tone it down, frame the message constructively but do not change the health indicator. Trust is more valuable than comfort.

**Flag staleness.** If an Epic's child issues have had no activity for more than a week, call it out — even if the Epic isn't overdue yet. Stale work is a leading indicator of missed deadlines.

## Process

### 1. Query Linear

Fetch current data from Linear:

1. **Get projects** — all projects under the Initiative (per-initiative mode) or the single configured project (per-project mode).
2. **For each project**, query issues labeled `epic` (from `docs/agents/labels.md`).
3. **For each Epic**, get: title, assignee (owner), due date, start date (startedAt or createdAt), and child issue completion (done / total).
4. **Get project health** from the latest Project Update (if any).

### 2. Assess health per Epic

For each Epic, determine its health:

| Condition | Health |
|---|---|
| All child issues done | ✅ Complete |
| On track — progress proportional to time remaining | 🟢 On track |
| Not started but not due yet (future start) | ⚪ Not started |
| Progress behind pace, OR child issues stale (>7 days no activity) | 🟡 At risk |
| Due date passed or will pass with significant work remaining | 🔴 Off track |

Use judgment — these are guidelines, not formulas. A 3/5 Epic due tomorrow is 🔴. A 0/6 Epic due in 30 days that hasn't started yet is ⚪, not 🔴.

### 3. Gather accomplishments (last 7 days)

For each Epic, query child issues where `completedAt` falls within the last 7 days. For each completed child:

1. Read the Epic's **Goal** from its description (the `## Goal` section).
2. Summarize the completed child issue in **business language** — framed as progress toward the Epic's goal, not as a raw issue title. One line per completed child.
3. Include the issue identifier parenthetically at the end (e.g., `(ENG-151)`).

Epics with no completions in the period are omitted from "What was done."

**Example:**

```markdown
### What was done

**Integrate Overwatch with Ergo Core** (Matheus)
Goal: Make claims consumable by Overwatch
- Claim extraction now includes verbatim quotes, context, and conditions (ENG-151)

**Complete Ergo Architecture Documentation** (Franco)
Goal: All Ergo systems modeled in LikeC4 and published
- Flashpoint lifecycle flow documented — CMS promoted to system-of-record (ENG-616)
- Unified docs site PRD shipped (ENG-626)
```

### 4. Assess overall health

Roll up from Epic health:

| Condition | Overall health |
|---|---|
| All Epics 🟢 or ✅ | 🟢 On track |
| Any Epic 🟡, none 🔴 | 🟡 At risk |
| Any Epic 🔴 | 🔴 Off track |

### 5. Draft the briefing

Use this template:

```markdown
## [Title] — Briefing · [Date]
Health: [🟢 On track | 🟡 At risk | 🔴 Off track]

### [Project Name 1]
[status icon] [Epic title] ([Owner]) — [due date] — [progress fraction] [optional: note]
[status icon] [Epic title] ([Owner]) — [due date] — [progress fraction] [optional: note]

### [Project Name 2]
[status icon] [Epic title] ([Owner]) — [due date] — [progress fraction]

### What was done

**[Epic title]** ([Owner])
Goal: [Epic goal from description]
- [Accomplishment in business language] ([issue identifier])
- [Accomplishment in business language] ([issue identifier])

### Actions needed
1. [Action item if any Epics are 🟡 or 🔴]
2. [Action item]

### What's going well
- [Completed or on-track items worth highlighting]
```

**Status icons per Epic:**
- ✅ Complete
- 🟢 On track
- ⚪ Not started (future)
- 🟡 At risk
- 🔴 Off track

**Rules:**
- Group Epics by Project (per-initiative mode shows project headers; per-project mode uses the project name as the title)
- Order within each project: 🔴 first, then 🟡, then 🟢, then ⚪, then ✅
- Include "What was done" only if any Epic had child issues completed in the last 7 days
- Include "Actions needed" only if there are at-risk or off-track Epics
- Include "What's going well" always — even in a 🔴 briefing, call out what's working
- Keep notes terse — one sentence max per Epic
- Do NOT list individual issue titles or identifiers

### 6. Generate the Gantt timeline chart

Generate a self-contained HTML Gantt chart using the template at `skills/to-briefing/gantt-template.html`.

**How to use the template:**

1. Read `gantt-template.html` from this skill's directory.
2. Build a `DATA` object from the queried Epics:

```javascript
const DATA = {
  title: "Wisner",                    // project name or initiative name
  subtitle: "Ergo Initiative",        // initiative name (per-project) or "" (per-initiative)
  date: "June 11, 2026",             // today's date, formatted
  today: "2026-06-11",               // today ISO
  health: "at-risk",                  // "on-track" | "at-risk" | "off-track"
  healthLabel: "🟡 At risk",          // human-readable
  rangeStart: "2026-06-09",           // ~2 days before earliest Epic start
  rangeEnd: "2026-08-04",            // ~3 days after latest Epic due
  source: "Source: Linear · Project Wisner",
  epics: [
    {
      name: "Integrate Overwatch with Ergo Core",
      owner: "Matheus Cascão",
      initials: "MC",
      color: "#6366f1",               // unique color per owner
      start: "2026-06-11",
      due: "2026-06-19",
      progress: 33,                   // 0-100
      label: "1 / 3 done",
      status: "at-risk",             // "complete"|"on-track"|"at-risk"|"off-track"|"not-started"
      project: "Wisner"              // used for grouping in initiative mode
    }
    // ...
  ]
};
```

3. Replace `{{DATA_JSON}}` in the template with the serialized DATA object.
4. Write the result to `docs/briefings/{slug}-gantt-{YYYY-MM-DD}.html` in the consuming project.
5. Also export a **PNG** of the chart next to the HTML (`docs/briefings/{slug}-gantt-{YYYY-MM-DD}.png`). The chart renders via JavaScript, so use a headless browser to load the HTML and screenshot it (e.g. headless Chrome: `--headless=new --screenshot=out.png --window-size=1200,640 --force-device-scale-factor=2 file://…`). This PNG is what gets embedded inline when posting (Step 8) — trackers render images inline, but not uploaded HTML files.

**Status mapping:**
- ✅ Complete → `"complete"`
- 🟢 On track → `"on-track"`
- ⚪ Not started → `"not-started"`
- 🟡 At risk → `"at-risk"`
- 🔴 Off track → `"off-track"`

**Owner colors:** Assign a distinct color from this palette to each unique owner. Reuse the same color if an owner appears across multiple Epics.

```
#6366f1  #7C3AED  #DB2777  #D97706  #059669
#2563EB  #9333EA  #E11D48  #CA8A04  #0D9488
```

**Chart features the template provides:**
- Weekly date ticks across the timeline
- Indigo "today" line
- Bars colored by health status with progress fills
- Project group headers when multiple projects are present
- Ownership table below the chart
- Hover tooltips on bars
- Print-friendly styles

### 7. Present and confirm

Show the briefing markdown to the user. Mention the Gantt chart was generated and where it was saved. Ask:

- Does the health assessment look right?
- Any context I'm missing that would change an Epic's status?
- Should I post this as an update in Linear?

### 8. Post (if confirmed)

If the user confirms, post the briefing:

- **Per initiative:** Post as an Initiative Update. Set the health indicator to match the assessed overall health.
- **Per project:** Post as a Project Update. Set the health indicator to match the assessed overall health.

**Embed the chart inline as an image.** Embed the **PNG** (from Step 6) directly in the update body so the timeline renders inline:

- If the tracker has an asset store (Linear, GitHub, GitLab all do), upload the PNG there and embed the returned asset URL with `![Epic timeline](<asset-url>)`. A tracker-hosted asset is self-contained and has no external dependency. For Linear, this is the `fileUpload` GraphQL mutation (request an upload URL, `PUT` the bytes, then embed the returned `assetUrl`); use the equivalent for other trackers.
- Do **not** upload the raw `.html` file expecting it to render — trackers serve uploads as downloadable assets, so an HTML upload becomes a download link, not a visible chart. Only images render inline.

**Default to image-only — do not attach a link to the HTML.** The chart is effectively static (the only interactive element is hover tooltips), so the embedded image carries the full message. A link to the interactive HTML adds fragility for little gain: it depends on a third-party renderer, on the file being on the default branch, and on the viewer having repo access — which stakeholders often lack. Keep the HTML committed in the repo as an artifact for anyone who wants the interactive/source version, but leave it out of the update body.

Only attach an HTML link if the user explicitly asks for the interactive version **and** the audience has repo access. In that case it must be an **absolute** URL — a relative repo path (`docs/briefings/…html`) resolves against the tracker's own domain and 404s. Use a rendered view (e.g. GitHub Pages, or `https://htmlpreview.github.io/?<absolute-blob-url>` for raw repo HTML) pointed at the file on the default branch, and ensure it is committed there first.

## What NOT to do

- Do NOT list individual issues, sub-issues, or PR numbers in the briefing.
- Do NOT soften health indicators when asked. Frame constructively, but report honestly.
- Do NOT generate a briefing without querying Linear for current data. Don't rely on conversation context alone — the data might be stale.
- Do NOT skip the confirmation step. The user should review before posting.
- Do NOT skip the Gantt chart generation. Every briefing includes a timeline chart.
