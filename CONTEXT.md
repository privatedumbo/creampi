# Creampi

A personal development toolkit for pi — skills, extensions, and tools. Hosts reusable workflow automation for AI-assisted development.

## Language

**Hard Feature**:
A feature that requires design decisions which would be costly to reverse. Triggers the full workflow pipeline (grill → PRD → issues → parallel execution).
_Avoid_: Complex feature, big feature

**Ad-hoc Task**:
A task where the cost of getting it slightly wrong is just a quick fix. Skips straight to implementation.
_Avoid_: Simple task, easy task

**Tier**:
A group of issues in the dependency graph that can execute in parallel. All issues in a tier have their blockers resolved. Tiers execute sequentially; issues within a tier execute concurrently.
_Avoid_: Batch, wave, phase

**AFK Slice**:
An issue that can be implemented and merged without human interaction. Agents work these autonomously within a tier.
_Avoid_: Automated task, auto issue

**HITL Slice**:
An issue that requires human interaction — an architectural decision, design review, or approval. Pauses the pipeline and notifies the developer.
_Avoid_: Manual task, human task

**Tier Boundary**:
The review gate between tiers. The developer reviews and merges all PRs from the completed tier before the next tier starts. This is the natural checkpoint where human judgment enters the autonomous pipeline.
_Avoid_: Review gate, sync point

**Orchestrator**:
The pi agent running the `run-tier` skill. Reads the dependency graph from Linear, computes tiers, dispatches parallel agents in worktrees, opens PRs, checks CI, and pauses at tier boundaries for review. Not a standalone process — it runs inside a pi session.
_Avoid_: Scheduler, runner, dispatcher

**Bootstrap Script**:
An idempotent shell script (`vps/vps.sh`) that configures a fresh Ubuntu 24.04 VPS with the full creampi development environment. Takes a `.env` file (secrets and git identity) and a `.creampi.yaml` file (model and workflow preferences) as inputs.
_Avoid_: Setup script, provisioner, installer

**VPS Provisioning Skill**:
A pi skill (`/create-vps`) that provisions a Hetzner VPS via `hcloud`, runs the Bootstrap Script on it, and reports the SSH connection string. Goes from "I want a machine" to "SSH in and start working" without leaving pi.
_Avoid_: Setup wizard, infra skill

## Example Dialogue

> **Dev:** "I want to build the new billing integration."
>
> **Pi:** "That sounds like it could go either way — full pipeline or just knock it out?"
>
> **Dev:** "Full pipeline."
>
> *Grill session runs, CONTEXT.md and ADRs updated.*
>
> **Dev:** "/to-prd"
>
> *PRD created as parent Linear issue.*
>
> **Dev:** "/to-issues"
>
> *Child issues created in Linear with native blocking relations. AFK and HITL slices identified.*
>
> **Dev:** `/run-tier ENG-42`
>
> *Orchestrator reads Linear, computes three tiers. Tier 1 has two AFK slices — dispatches two pi agents in separate worktrees. Both finish, CI green, PRs opened.*
>
> **Orchestrator:** "Tier 1 complete. 2 PRs ready for review."
>
> *Dev reviews, merges, runs `/run-tier ENG-42` again. Orchestrator re-reads Linear, computes tier 2. One HITL slice — pauses and notifies. One AFK slice — dispatches immediately.*
>
> **Orchestrator:** "ENG-45 needs your input before proceeding."
>
> *Dev resolves the HITL issue. Orchestrator picks up tier 3.*
