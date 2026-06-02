---
name: create-vps
description: Provision a Hetzner VPS via hcloud, run the bootstrap script on it, and report a ready-to-use SSH connection string. Idempotent — safe to re-run at any step.
---

# Create VPS

Provision a Hetzner VPS, bootstrap it with the creampi development environment, and hand the developer a ready-to-use SSH connection string. The entire flow runs inside a pi session.

## Vocabulary

Use these terms precisely (see CONTEXT.md):

- **Bootstrap Script** — the idempotent `bootstrap/vps.sh` that configures a fresh Ubuntu 24.04 VPS

## Reference

### Server types

| Type | Spec | Price |
|------|------|-------|
| cpx22 | 2 vCPU / 4 GB | €7.99/mo |
| cpx31 | 4 vCPU / 8 GB | €13.99/mo |
| cpx41 | 8 vCPU / 16 GB | €26.99/mo |
| cax21 | 4 ARM vCPU / 8 GB | €5.49/mo |

### Locations

| Code | Location |
|------|----------|
| nbg1 | Nuremberg, Germany |
| fsn1 | Falkenstein, Germany |
| hel1 | Helsinki, Finland |
| ash | Ashburn, USA |
| hil | Hillsboro, USA |

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

### 3. Read config

Locate `.creampi.yaml` using this fallback hierarchy (first match wins):

1. **Project root** — `.creampi.yaml` in the current working directory
2. **Home directory** — `~/.creampi.yaml`
3. **Hardcoded defaults** — use the defaults below

Read the `vps:` section. Apply these defaults for any missing keys:

```yaml
vps:
  provider: hetzner
  region: nbg1
  size: cpx22
  name: creampi-dev
```

Store the resolved values: `{name}`, `{region}`, `{size}`.

### 4. Check SSH key

Check for an existing SSH key:

```bash
test -f ~/.ssh/id_ed25519
```

If missing, generate one:

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
```

Then ensure the public key is uploaded to Hetzner. Check if it already exists:

```bash
hcloud ssh-key list -o noheader -o columns=name | grep -q '^creampi$'
```

If the key name `creampi` does not exist, upload it:

```bash
hcloud ssh-key create --name creampi --public-key-from-file ~/.ssh/id_ed25519.pub
```

If the key name already exists, skip — do not fail.

### 5. Check for existing server

Check whether a server with the configured name already exists:

```bash
hcloud server list --output json
```

Parse the JSON output and look for a server whose `name` matches `{name}`. If found:

1. Extract the server's public IPv4 address
2. Report the connection details (same format as step 9)
3. **Stop** — do not create a new server

If no match, continue to step 6.

### 6. Create server

Create the VPS:

```bash
hcloud server create \
  --name {name} \
  --image ubuntu-24.04 \
  --type {size} \
  --location {region} \
  --ssh-key creampi \
  --output json
```

Parse the JSON output and extract the server's public IPv4 address as `{ip}`.

If creation fails, report the error and stop.

### 7. Wait for SSH

Poll until SSH is available on the new server:

```bash
ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@{ip} echo ok
```

Retry every 5 seconds. Timeout after 2 minutes (24 attempts). If SSH is not available after 2 minutes, report the timeout and stop.

### 8. Upload and run bootstrap

Locate the bootstrap files from the installed creampi package. The `bootstrap/` directory is a sibling of the `skills/` directory in the creampi package tree. Resolve the path relative to this skill file:

- `bootstrap/vps.sh` — the bootstrap script (required)

Locate the config files to upload:

- `.env` — from project root, then `~/.env` (required — stop with clear instructions if not found)
- `.creampi.yaml` — from the same config resolution hierarchy used in step 3

Upload files to the server:

```bash
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {path-to-bootstrap/vps.sh} root@{ip}:~/vps.sh
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {path-to-.env} root@{ip}:~/.env
```

If a `.creampi.yaml` file was found in step 3 (not using hardcoded defaults), also upload it:

```bash
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {path-to-.creampi.yaml} root@{ip}:~/.creampi.yaml
```

If no `.creampi.yaml` file exists (step 3 fell through to hardcoded defaults), skip this upload — the bootstrap script treats it as optional.

Use the resolved absolute paths for all local files.

Then run the bootstrap script:

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@{ip} 'bash ~/vps.sh'
```

Stream the output so the developer can see progress. If the bootstrap fails, report the error but still report the SSH connection string — the developer may want to debug manually.

### 9. Report

Print the connection details:

```
🎉 VPS ready!

Connect:        ssh root@{ip}
Start working:  tmux new -s tier
Detach:         Ctrl-b d
Reattach:       ssh root@{ip} -t 'tmux attach -t tier'
```

## Error handling

- Every step checks its precondition before proceeding. If a precondition fails, guide the developer through fixing it rather than silently skipping.
- The skill is idempotent at every step — safe to re-run if interrupted partway through. Re-running when a server already exists reports the existing server (step 5) rather than failing.
- Never silently skip errors. Always tell the developer what happened and what to do next.
