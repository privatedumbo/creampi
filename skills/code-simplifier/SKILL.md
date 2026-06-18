---
name: code-simplifier
description: Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality. Focuses on recently modified code unless instructed otherwise. Use when user says "simplify", "clean up this code", "refactor for clarity", or asks to review code for readability.
model: opus
---

<!--
  Based on the code-simplifier plugin from claude-plugins-official
  Original author: Anthropic — Apache License 2.0
  See THIRD-PARTY-NOTICES.md for the full license text.
  Modifications: replaced hardcoded CLAUDE.md / ES-module / React standards
  with dynamic project-context reading (CONTEXT.md, docs/adr/); added
  explicit file-targeting and git-diff modes; aligned with beyond-data
  skill conventions.
-->

# Code Simplifier

Simplify and refine code for clarity, consistency, and maintainability — without changing what it does.

## Process

### 1. Determine scope

Decide what code to simplify, in priority order:

1. **Explicit target** — if the user names files, functions, or a code block, use that.
2. **Git diff** — if no explicit target, run `git diff --name-only HEAD~1` (or the range the user specifies) and work on those files.
3. **Recent session changes** — if neither of the above, simplify code that was modified during the current conversation.

If scope is still unclear, ask the user.

### 2. Read project standards

Read whatever project-level standards exist. Check for:

- `CONTEXT.md` at the repo root — domain glossary and architecture principles
- `docs/adr/` — Architecture Decision Records in the area you're touching
- `CLAUDE.md` — project coding standards (if present)
- `.editorconfig`, `eslint` / `biome` / `ruff` configs — formatting and lint rules

Adapt your refinements to the project's actual conventions, not a generic style guide.

### 3. Analyze the code

For each file in scope:

1. Read the file fully.
2. Identify opportunities grouped into:
   - **Structure** — unnecessary nesting, redundant abstractions, overly clever indirection
   - **Naming** — unclear variable / function / type names
   - **Redundancy** — dead code, duplicated logic, unnecessary comments that restate the obvious
   - **Consistency** — deviations from the project's established patterns and conventions
   - **Readability** — dense one-liners, nested ternaries, implicit control flow

### 4. Apply refinements

Edit the code, following these principles:

**Preserve functionality.** Never change what the code does — only how it expresses it. All original features, outputs, error handling, and edge-case behaviors must remain intact.

**Prefer clarity over brevity.**
- Avoid nested ternary operators — use `if`/`else` or `switch` instead.
- Don't compress multiple concerns into a single expression just to save lines.
- Explicit code is better than clever code.

**Respect existing abstractions.** Don't flatten helpful abstractions that improve organization. Only remove abstractions that add indirection without adding clarity.

**Stay proportional.** Small scope = small changes. Don't rewrite an entire module when the user touched three lines.

### 5. Summarize changes

After applying edits, produce a brief summary:

- **Files changed** — list each file
- **What changed** — one bullet per meaningful simplification (not per line edit)
- **What was preserved** — note any complexity you intentionally left alone and why

Keep the summary short. If fewer than 3 things changed, a single sentence is fine.

## Anti-patterns to avoid

- Over-simplifying to the point of removing useful structure
- Rewriting working code in a different paradigm (e.g., OOP → FP) without being asked
- Removing error handling or edge-case guards for "simplicity"
- Introducing clever abstractions to reduce line count
- Touching code outside the determined scope
- Adding comments to explain changes — the code should speak for itself
