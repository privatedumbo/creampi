---
name: sync-upstream-skills
description: Use when forked skills may have drifted from upstream, after noticing upstream releases, or on a monthly cadence. Covers to-prd, to-issues (mattpocock/skills) and writing-skills (obra/superpowers).
---

# Sync Upstream Skills

Check that our forked skills stay in sync with their upstream source.

## Upstream sources

These skills are derived from upstream repos (both MIT licensed):

### mattpocock/skills

| Local skill | Upstream path | What we changed |
|---|---|---|
| `skills/to-prd/SKILL.md` | `skills/engineering/to-prd/SKILL.md` | Replaced "seams" with "deep modules" language; added setup section pointing to `docs/agents/` |
| `skills/to-issues/SKILL.md` | `skills/engineering/to-issues/SKILL.md` | Added Section 7 (Linear blocking relations for tier orchestration); added setup section pointing to `docs/agents/`; minor wording tweaks |

### obra/superpowers

| Local skill | Upstream path | What we changed |
|---|---|---|
| `skills/writing-skills/SKILL.md` | `skills/writing-skills/SKILL.md` | Vendored as-is, no modifications |

## Process

### 1. Fetch upstream and diff

For each forked skill, fetch the latest upstream version and diff it against our local copy.

```bash
# to-prd
diff <(curl -s https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-prd/SKILL.md) skills/to-prd/SKILL.md

# to-issues
diff <(curl -s https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-issues/SKILL.md) skills/to-issues/SKILL.md

# writing-skills
diff <(curl -s https://raw.githubusercontent.com/obra/superpowers/main/skills/writing-skills/SKILL.md) skills/writing-skills/SKILL.md
```

### 2. Classify the diff

For each skill, classify every hunk as one of:

| Category | Meaning | Action |
|---|---|---|
| **Our addition** | Lines we added that don't exist upstream (e.g., Section 7, setup block, deep-modules) | Keep — this is our value-add |
| **Our rewording** | Lines we intentionally changed from upstream | Keep — review if upstream improved the same area |
| **Upstream change** | New or changed lines upstream that we don't have | Evaluate — merge if valuable, skip if irrelevant |
| **Upstream removal** | Lines upstream deleted that we still have | Evaluate — may indicate upstream found a problem |

### 3. Present the report

For each skill, show: our additions count, upstream changes count, and whether action is needed. For each upstream-change hunk, show the diff, whether it conflicts with our additions, and recommend **merge**, **skip**, or **adapt**.

### 4. Apply approved changes

If the user approves any merges, apply them to the local skill files. Preserve our additions — never overwrite our custom sections.

After applying, re-run the diff to confirm the result looks correct.

### 5. Update the sync log

Append a line to `docs/upstream-sync-log.md` (create if it doesn't exist):

```markdown
| <date> | <skill> | <upstream commit or "no changes"> | <action taken> |
```

## Notes

- This skill does NOT auto-merge. It reports drift and waits for human judgment.
- If upstream restructures significantly (renames, splits files), the diff will be noisy — read the upstream changelog or commit messages to understand the intent before acting.
- The upstream repo is MIT licensed. Our attribution is in each skill's header and in `THIRD-PARTY-NOTICES.md`.
