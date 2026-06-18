---
name: sync-upstream-skills
description: Use when forked skills may have drifted from upstream, after noticing upstream releases, or on a monthly cadence. Covers to-prd, to-issues (mattpocock/skills) and writing-skills (obra/superpowers).
---

# Sync Upstream Skills

Check that our forked skills stay in sync with their upstream source **and** detect new upstream skills we may want to adopt.

## Upstream sources

These skills are derived from upstream repos (both MIT licensed):

### mattpocock/skills

| Local skill | Upstream path | What we changed |
|---|---|---|
| `skills/to-prd/SKILL.md` | `skills/engineering/to-prd/SKILL.md` | Replaced "seams" with "deep modules" language; added setup section pointing to `docs/agents/`; added `disable-model-invocation: true` |
| `skills/to-issues/SKILL.md` | `skills/engineering/to-issues/SKILL.md` | Added Section 7 (Linear blocking relations for tier orchestration); added setup section pointing to `docs/agents/`; added `disable-model-invocation: true`; minor wording tweaks |
| `skills/grill-with-docs/SKILL.md` | `skills/engineering/grill-with-docs/SKILL.md` | Vendored as-is, no modifications |
| `skills/domain-modeling/SKILL.md` | `skills/engineering/domain-modeling/SKILL.md` | Vendored as-is, no modifications |

### obra/superpowers

| Local skill | Upstream path | What we changed |
|---|---|---|
| `skills/writing-skills/SKILL.md` | `skills/writing-skills/SKILL.md` | Vendored as-is, no modifications |

## Process

### 1. Discover upstream skills

Before diffing known forks, list ALL skills available upstream and compare against what we have locally. This catches new skills we may want to adopt.

```bash
# List all upstream engineering skills
curl -s "https://api.github.com/repos/mattpocock/skills/contents/skills/engineering" | jq -r '.[].name'

# List all local skills
ls skills/
```

Compare the two lists. Classify each upstream skill as:

| Category | Meaning |
|---|---|
| **Tracked** | We have it locally (forked or vendored) — proceed to step 2 for diffing |
| **Skipped (known)** | We've evaluated and deliberately skipped it — list the reason below |
| **New** | Upstream skill we haven't evaluated yet — flag for review |

#### Deliberately skipped upstream skills

| Upstream skill | Reason skipped |
|---|---|
| `setup-matt-pocock-skills` | We use `setup-privatedumbo-skills` with `docs/agents/` config instead |
| `ask-matt` | Skill router — our pipeline is fixed (grill → prd → issues → tdd → run-tier) |
| `implement` | Our `run-tier` worker prompt embeds this more thoroughly for AFK execution |
| `tdd` | We vendor this to `~/.pi/agent/skills/` and `~/.agents/skills/` but not to this repo (identical to upstream, no modifications needed) |

Any upstream skill not in the **Tracked** or **Skipped** tables above is **New** — present it to the user with its description and recommend adopt/skip/evaluate.

### 2. Fetch upstream and diff tracked skills

For each tracked skill, fetch the latest upstream version and diff it against our local copy.

```bash
# to-prd
diff <(curl -s https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-prd/SKILL.md) skills/to-prd/SKILL.md

# to-issues
diff <(curl -s https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-issues/SKILL.md) skills/to-issues/SKILL.md

# grill-with-docs
diff <(curl -s https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/grill-with-docs/SKILL.md) skills/grill-with-docs/SKILL.md

# domain-modeling
diff <(curl -s https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/domain-modeling/SKILL.md) skills/domain-modeling/SKILL.md

# writing-skills
diff <(curl -s https://raw.githubusercontent.com/obra/superpowers/main/skills/writing-skills/SKILL.md) skills/writing-skills/SKILL.md
```

### 3. Check for upstream commit activity

Fetch recent commits to catch renames, removals, or restructuring that a file-level diff would miss:

```bash
# Last 2 weeks of upstream engineering skill changes
curl -s "https://api.github.com/repos/mattpocock/skills/commits?path=skills/engineering&since=$(date -v-14d +%Y-%m-%dT00:00:00Z)&per_page=30" | jq -r '.[] | "\(.commit.committer.date | split("T")[0]) | \(.commit.message | split("\n")[0])"'
```

If any commit mentions a skill we track (renamed, removed, restructured), flag it.

### 4. Classify the diff

For each tracked skill, classify every hunk as one of:

| Category | Meaning | Action |
|---|---|---|
| **Our addition** | Lines we added that don't exist upstream (e.g., Section 7, setup block, deep-modules) | Keep — this is our value-add |
| **Our rewording** | Lines we intentionally changed from upstream | Keep — review if upstream improved the same area |
| **Upstream change** | New or changed lines upstream that we don't have | Evaluate — merge if valuable, skip if irrelevant |
| **Upstream removal** | Lines upstream deleted that we still have | Evaluate — may indicate upstream found a problem |

### 5. Present the report

Summary format:

```
## Sync Report — <date>

### New upstream skills
- <skill>: <description> — Recommend: adopt / skip / evaluate

### Tracked skill drift
- <skill>: <N> our additions (keep), <N> upstream changes (evaluate)

### Skipped skills (no change needed)
- <skill>: still deliberately skipped, reason unchanged
```

For each upstream-change hunk, show the diff, whether it conflicts with our additions, and recommend **merge**, **skip**, or **adapt**.

### 6. Apply approved changes

If the user approves any merges or adoptions, apply them to the local skill files. Preserve our additions — never overwrite our custom sections.

When vendoring a new skill, add the attribution comment block and update the tracking table in this skill file.

After applying, re-run the diff to confirm the result looks correct.

### 7. Update the sync log

Append a line to `docs/upstream-sync-log.md` (create if it doesn't exist):

```markdown
| <date> | <skill> | <upstream commit or "no changes"> | <action taken> |
```

## Notes

- This skill does NOT auto-merge. It reports drift and waits for human judgment.
- If upstream restructures significantly (renames, splits files), the diff will be noisy — read the upstream changelog or commit messages to understand the intent before acting.
- The upstream repo is MIT licensed. Our attribution is in each skill's header and in `THIRD-PARTY-NOTICES.md`.
- The "deliberately skipped" table must be maintained. When evaluating a new upstream skill and deciding to skip it, add it to the table with a reason so future syncs don't re-flag it.
