# creampi

A personal development toolkit for [pi](https://pi.dev/) — skills, extensions, and prompt templates for tier-based parallel agent execution from Linear issues.

## Install

creampi distributes two things — install whichever you need:

**1. Skills** (agent-agnostic, works across all supported agents):

```bash
npx skills add privatedumbo/creampi
```

**2. The pi extension** (Linear SDK custom tools — required by `/run-tier`):

```bash
pi install git:github.com/privatedumbo/creampi
```

`pi install` also brings the skills along, so on pi it's the only command you need. Use `npx skills add` when consuming the skills from a non-pi agent. The `/run-tier` workflow requires the extension regardless, because it depends on custom tools (`linear_fetch_issues`, `compute_tiers`, `open_pr`, `check_ci`, `linear_update_status`) that skills alone cannot provide.

Requires:
- `LINEAR_API_KEY` environment variable
- `gh` CLI authenticated (for PRs and CI checks)

## Usage

### First-time setup

```
/setup-privatedumbo-skills  → scaffold docs/agents/ config (tracker, labels, ways of working)
```

### Planning phase (Linear, end to end)

```
/to-epic          → create a time-bound Epic (labeled parent issue)
/to-prd           → publish a PRD as a parent Linear issue
/to-issues        → break a plan into AFK/HITL vertical slices with blocking relations
/to-briefing      → generate a stakeholder status update with a Gantt timeline
/domain-modeling  → build and sharpen a project's domain model (glossary + ADRs)
```

### Authoring & maintenance

```
/writing-skills        → TDD methodology for creating, editing, and verifying skills
/sync-upstream-skills  → check forked skills (to-prd, to-issues, writing-skills) against upstream
```

### Execution phase

```
/run-tier PROJ-42
```

Reads Linear, computes tiers from the dependency graph, dispatches parallel agents in worktrees for AFK slices, pauses for HITL slices, opens PRs, checks CI, stops at the tier boundary for review. Re-run after merging to continue.

## Configure

creampi uses a `.creampi.yaml` file for per-developer settings. The file is resolved using a fallback hierarchy (first match wins):

1. **Project root** — `.creampi.yaml` in the current working directory
2. **Home directory** — `~/.creampi.yaml`
3. **Built-in defaults** — sensible defaults if no file is found

The file is `.gitignore`d — it's per-developer, not per-project.

```yaml
models:
  worker: "anthropic/claude-sonnet-4"    # model for AFK agents
  reviewer: "anthropic/claude-opus-4"    # model for review pass

workflow:
  review: true          # review worker output before opening PRs
  maxReviewRounds: 2    # max review iterations per worker

vps:
  provider: hetzner      # only option today
  region: nbg1            # Hetzner location
  size: cx22              # Hetzner server type
```

## VPS Bootstrap

Run tier execution on a remote VPS for long-running, unattended workflows. The bootstrap script (`vps/vps.sh`) is idempotent — it configures a fresh Ubuntu 24.04 VPS with the full creampi development environment.

### Manual workflow

1. **Prepare config files** — copy the examples and fill in your values:

   ```bash
   cp vps/.env.example .env
   cp vps/.creampi.yaml.example .creampi.yaml
   ```

   `.env` requires: `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, `GH_TOKEN`, `GIT_USER_NAME`, `GIT_USER_EMAIL`. Optionally include `HCLOUD_TOKEN` for Hetzner API access.

   > **Note:** The `.env` file is only needed for VPS bootstrap — it transfers secrets to a fresh machine. On your local machine, these variables are typically already in your shell environment and don't need a file.

2. **Upload to the VPS**:

   ```bash
   scp vps/vps.sh .env .creampi.yaml root@<vps-ip>:~/
   scp -r vps/dotfiles root@<vps-ip>:~/dotfiles
   ```

3. **SSH in and run the bootstrap**:

   ```bash
   ssh root@<vps-ip>
   bash vps.sh
   ```

4. **Use tmux for persistent sessions**:

   ```bash
   tmux new -s tier
   cd ~/projects && git clone <repo>
   cd <repo> && pi
   /run-tier ENG-42
   ```

   Detach with `Ctrl-b d`. Reattach later with `tmux attach -t tier`, or remotely:

   ```bash
   ssh root@<vps-ip> -t 'tmux attach -t tier'
   ```

### Automated provisioning with `/create-vps`

The `/create-vps` skill automates the entire VPS lifecycle — provision a Hetzner VPS, run the bootstrap script, and get an SSH connection string without leaving pi:

```
/create-vps [name]
```

The server name is an optional inline argument (default: `creampi`). For example, `/create-vps staging` creates a server named `staging`.

**Requirements:**
- `hcloud` CLI installed locally (`brew install hcloud` on macOS)
- `HCLOUD_TOKEN` environment variable set with a Hetzner Cloud API token

The skill reads VPS infrastructure settings (`region`, `size`) from the `vps:` section of `.creampi.yaml` (using the same resolution hierarchy described above). Defaults:

```yaml
vps:
  provider: hetzner
  region: nbg1        # Nuremberg, Germany
  size: cx22          # 2 vCPU / 4 GB RAM (Hetzner CX22)
```

The skill is idempotent — re-running when a server already exists reports the existing server rather than creating a new one.

## Repo Structure

```
creampi/
├── extensions/creampi/   # pi extension — Linear SDK tools for the agent
├── skills/               # pi skills
│   ├── setup-privatedumbo-skills/ # /setup-privatedumbo-skills — scaffold docs/agents/ config
│   ├── to-epic/          #   /to-epic — create a time-bound Epic
│   ├── to-prd/           #   /to-prd — publish a PRD as a parent issue
│   ├── to-issues/        #   /to-issues — break plans into Linear issues
│   ├── to-briefing/      #   /to-briefing — stakeholder status update + Gantt
│   ├── domain-modeling/  #   /domain-modeling — build domain model (glossary + ADRs)
│   ├── writing-skills/   #   /writing-skills — TDD methodology for authoring skills (obra/superpowers)
│   ├── sync-upstream-skills/ # /sync-upstream-skills — check forked skills against upstream
│   ├── create-vps/       #   /create-vps — provision a Hetzner VPS
│   ├── delete-vps/       #   /delete-vps — tear down a Hetzner VPS
│   └── run-tier/         #   /run-tier — execute the next unblocked tier
├── prompts/              # prompt templates for agent workflows
├── vps/                  # VPS provisioning (bootstrap + dotfiles)
│   ├── vps.sh            #   idempotent Ubuntu 24.04 bootstrap
│   ├── .env.example      #   secrets template
│   ├── .creampi.yaml.example  # config template
│   └── dotfiles/         #   shell config deployed by the bootstrap
├── docs/adr/             # architectural decision records
├── LICENSE               # MIT
├── THIRD-PARTY-NOTICES.md # licenses for vendored upstream skills
└── CONTEXT.md            # domain vocabulary and project conventions
```

## Attribution

`to-prd`, `to-issues`, and `domain-modeling` are derived from [mattpocock/skills](https://github.com/mattpocock/skills) by Matt Pocock (MIT licensed). `writing-skills` is from [obra/superpowers](https://github.com/obra/superpowers) by Jesse Vincent (MIT licensed). See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for full license texts. Run `/sync-upstream-skills` periodically to check for upstream changes.

## License

[MIT](LICENSE) © privatedumbo. Vendored upstream skills retain their own MIT licenses — see [Attribution](#attribution) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
