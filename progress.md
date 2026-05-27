# Progress

## ENG-374: /to-issues override with native Linear blocking relations
- **Status**: ✅ Complete
- **What was done**: Created `skills/to-issues/SKILL.md` — a local skill override that extends the upstream `/to-issues` with step 6: after publishing issues, set native blocking relations in Linear via `linear-cli issue save --blocked-by`.
- **Key decisions**:
  - Same `name: to-issues` as upstream — strict superset (steps 1-5 identical, step 6 added)
  - Uses `--blocked-by` flag (repeatable) for multi-blocker issues
  - Includes verification step (spot-check with `issue get`)
- **Files changed**: `skills/to-issues/SKILL.md`
- **Risks**: Name collision with upstream `to-issues` skill — pi warns and keeps first found. When creampi is installed as a package, load order determines which wins. Our version is a strict superset so either is safe.
