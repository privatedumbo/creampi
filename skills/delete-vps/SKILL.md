---
name: delete-vps
description: Delete a Hetzner VPS by name. Accepts an optional server name (default: `creampi`).
argument-hint: "[name]"
---

# Delete VPS

Delete a Hetzner VPS by name and report what was destroyed. The entire flow runs inside a pi session.

## Vocabulary

Use these terms precisely (see CONTEXT.md):

- **Bootstrap Script** — the idempotent `bootstrap/vps.sh` that configures a fresh Ubuntu 24.04 VPS

## Process

### 1. Check `hcloud` CLI

Verify `hcloud` is installed by running:

```bash
hcloud version
```

If the command fails (not found), guide the developer through installation:

- **macOS**: `brew install hcloud`
- **Linux**: download from https://github.com/hetznercloud/cli/releases

Do not proceed until `hcloud version` succeeds.

### 2. Check auth

Verify `hcloud` is authenticated by running:

```bash
hcloud server list
```

If it fails with an authentication error, check whether `HCLOUD_TOKEN` is set in the environment (it may be in the developer's `.env` file). If set, `hcloud` will use it automatically — retry the command.

If `HCLOUD_TOKEN` is not set and `hcloud` is not authenticated, guide the developer:

1. Create an API token at https://console.hetzner.cloud/ → project → Security → API Tokens
2. Either set `export HCLOUD_TOKEN=<token>` in their shell, or run `hcloud context create creampi` and paste the token when prompted

Do not proceed until `hcloud server list` succeeds.

### 3. Resolve name

Read `$ARGUMENTS` (the text after `/delete-vps` in the invocation).

- If an argument is provided, use the first word as `{name}`.
- If no argument is provided, default to `creampi`.

Store the resolved value as `{name}`.

### 4. Find server

List all servers:

```bash
hcloud server list --output json
```

Parse the JSON output and look for a server whose `name` matches `{name}`. If found, extract:

- `{ip}` — the server's public IPv4 address
- `{location}` — the server's datacenter location (e.g. `nbg1`)

If no server matches `{name}`, report:

```
ℹ️ No server named "{name}" found. Nothing to delete.
```

**Stop** — this is not an error.

### 5. Delete server

Delete the server:

```bash
hcloud server delete {name}
```

If deletion fails, report the error and stop.

### 6. Report

Print what was destroyed:

```
🗑️ Server deleted

Name:     {name}
IP:       {ip}
Location: {location}
```

## Error handling

- Every step checks its precondition before proceeding. If a precondition fails, guide the developer through fixing it rather than silently skipping.
- When no server matches the name, report it clearly and stop — this is a no-op, not an error.
- Never silently skip errors. Always tell the developer what happened and what to do next.
- The `creampi` SSH key in Hetzner is intentionally left intact after server deletion. It will be reused if a new server is provisioned later.
