# creampi

A personal development toolkit for [pi](https://pi.dev/) — skills, extensions, and prompt templates for tier-based parallel agent execution from Linear issues.

## Install

```bash
pi install git:github.com/privatedumbo/creampi
```

Requires:
- `LINEAR_API_KEY` environment variable
- `gh` CLI authenticated (for PRs and CI checks)

## Usage

### Design phase (interactive)

```
/grill-with-docs  → stress-test plan, update CONTEXT.md + ADRs
/to-prd           → publish PRD as parent Linear issue
/to-issues        → break into AFK/HITL slices with blocking relations
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
  name: creampi-dev       # server name
```

## VPS Bootstrap

Run tier execution on a remote VPS for long-running, unattended workflows. The bootstrap script (`bootstrap/vps.sh`) is idempotent — it configures a fresh Ubuntu 24.04 VPS with the full creampi development environment.

### Manual workflow

1. **Prepare config files** — copy the examples and fill in your values:

   ```bash
   cp bootstrap/.env.example .env
   cp bootstrap/.creampi.yaml.example .creampi.yaml
   ```

   `.env` requires: `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, `GH_TOKEN`, `GIT_USER_NAME`, `GIT_USER_EMAIL`. Optionally include `HCLOUD_TOKEN` for Hetzner API access.

2. **Upload to the VPS**:

   ```bash
   scp bootstrap/vps.sh .env .creampi.yaml root@<vps-ip>:~/
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
/create-vps
```

**Requirements:**
- `hcloud` CLI installed locally (`brew install hcloud` on macOS)
- `HCLOUD_TOKEN` environment variable set with a Hetzner Cloud API token

The skill reads VPS settings from the `vps:` section of `.creampi.yaml` (using the same resolution hierarchy described above). Defaults:

```yaml
vps:
  provider: hetzner
  region: nbg1        # Nuremberg, Germany
  size: cx22          # 2 vCPU / 4 GB — €4.49/mo
  name: creampi-dev
```

The skill is idempotent — re-running when a server already exists reports the existing server rather than creating a new one.

## Repo Structure

```
creampi/
├── extensions/creampi/   # pi extension — Linear SDK tools for the agent
├── skills/               # pi skills
│   ├── create-vps/       #   /create-vps — provision a Hetzner VPS
│   ├── run-tier/         #   /run-tier — execute the next unblocked tier
│   └── to-issues/        #   /to-issues — break plans into Linear issues
├── prompts/              # prompt templates for agent workflows
├── bootstrap/            # VPS bootstrap script and config examples
│   ├── vps.sh            #   idempotent Ubuntu 24.04 setup
│   ├── .env.example      #   secrets template
│   └── .creampi.yaml.example  # config template
├── docs/adr/             # architectural decision records
└── CONTEXT.md            # domain vocabulary and project conventions
```

## License

Private.
