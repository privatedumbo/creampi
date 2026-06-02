#!/usr/bin/env bash
# bootstrap/vps.sh — Idempotent bootstrap for a fresh Ubuntu 24.04 VPS.
# Configures the machine as a fully functional creampi development environment.
#
# Usage:
#   scp bootstrap/vps.sh .env .creampi.yaml user@vps:~/
#   ssh user@vps
#   bash vps.sh
#
# Inputs (same directory as this script):
#   .env            — secrets and git identity (see .env.example)
#   .creampi.yaml   — model and workflow preferences (see .creampi.yaml.example)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# 0. Source .env
# ---------------------------------------------------------------------------
ENV_FILE="${SCRIPT_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env file not found at ${ENV_FILE}"
  echo "   Copy .env.example to .env and fill in the values."
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

for var in ANTHROPIC_API_KEY LINEAR_API_KEY GH_TOKEN GIT_USER_NAME GIT_USER_EMAIL; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Required variable ${var} is empty or unset in .env"
    exit 1
  fi
done

echo "✅ .env loaded"

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
PACKAGES=(
  git git-lfs tmux curl build-essential bash-completion
  # Python build dependencies (asdf/pyenv compiles from source)
  libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev
  libffi-dev liblzma-dev
)
MISSING=()
for pkg in "${PACKAGES[@]}"; do
  if ! dpkg -s "$pkg" &>/dev/null; then
    MISSING+=("$pkg")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "📦 Installing system packages: ${MISSING[*]}"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${MISSING[@]}"
else
  echo "✅ System packages already installed"
fi

# Initialize git-lfs if not already
if ! git lfs env &>/dev/null; then
  git lfs install
fi

# ---------------------------------------------------------------------------
# 2. Git configuration (before any git clone)
# ---------------------------------------------------------------------------
echo "🔧 Configuring git"
git config --global user.name "$GIT_USER_NAME"
git config --global user.email "$GIT_USER_EMAIL"
# Rewrite all GitHub URLs to authenticated HTTPS (covers asdf plugins, SSH refs, etc.)
# Clear any previous insteadOf values first (idempotent)
git config --global --unset-all "url.https://${GH_TOKEN}@github.com/.insteadOf" 2>/dev/null || true
git config --global "url.https://${GH_TOKEN}@github.com/.insteadOf" "https://github.com/"
git config --global --add "url.https://${GH_TOKEN}@github.com/.insteadOf" "git@github.com:"
echo "✅ Git configured"

# ---------------------------------------------------------------------------
# 3. asdf
# ---------------------------------------------------------------------------
ASDF_DIR="${HOME}/.asdf"
if [[ ! -d "$ASDF_DIR" ]]; then
  echo "📦 Installing asdf"
  git clone https://github.com/asdf-vm/asdf.git "$ASDF_DIR" --branch v0.15.0
else
  echo "✅ asdf already installed"
fi

# Ensure asdf is on the path for this session
export ASDF_DIR
export ASDF_DATA_DIR="${ASDF_DATA_DIR:-$HOME/.asdf}"
# shellcheck source=/dev/null
source "${ASDF_DIR}/asdf.sh"

# Add asdf to .bashrc if not already present
if ! grep -q 'asdf.sh' ~/.bashrc 2>/dev/null; then
  cat >> ~/.bashrc << 'ASDF_BASHRC'

# asdf version manager
export ASDF_DIR="$HOME/.asdf"
. "$ASDF_DIR/asdf.sh"
. "$ASDF_DIR/completions/asdf.bash"
ASDF_BASHRC
  echo "✅ asdf added to .bashrc"
fi

# ---------------------------------------------------------------------------
# 4. Node.js via asdf
# ---------------------------------------------------------------------------
NODE_VERSION="25.8.2"
if ! asdf plugin list 2>/dev/null | grep -q nodejs; then
  echo "📦 Adding asdf nodejs plugin"
  asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
fi

if ! asdf list nodejs 2>/dev/null | grep -q "$NODE_VERSION"; then
  echo "📦 Installing Node.js ${NODE_VERSION}"
  asdf install nodejs "$NODE_VERSION"
else
  echo "✅ Node.js ${NODE_VERSION} already installed"
fi
asdf global nodejs "$NODE_VERSION"

# ---------------------------------------------------------------------------
# 5. Python via asdf
# ---------------------------------------------------------------------------
PYTHON_VERSION="3.13.12"
if ! asdf plugin list 2>/dev/null | grep -q python; then
  echo "📦 Adding asdf python plugin"
  asdf plugin add python https://github.com/danhper/asdf-python.git
fi

if ! asdf list python 2>/dev/null | grep -q "$PYTHON_VERSION"; then
  echo "📦 Installing Python ${PYTHON_VERSION}"
  asdf install python "$PYTHON_VERSION"
else
  echo "✅ Python ${PYTHON_VERSION} already installed"
fi
asdf global python "$PYTHON_VERSION"

# ---------------------------------------------------------------------------
# 6. pi
# ---------------------------------------------------------------------------
if ! command -v pi &>/dev/null; then
  echo "📦 Installing pi"
  npm install -g @earendil-works/pi-coding-agent
  asdf reshim nodejs
else
  echo "✅ pi already installed"
fi

# ---------------------------------------------------------------------------
# 7. gh CLI
# ---------------------------------------------------------------------------
if ! command -v gh &>/dev/null; then
  echo "📦 Installing gh CLI"
  sudo mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
  sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli-stable.list >/dev/null
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq gh
else
  echo "✅ gh CLI already installed"
fi

# Authenticate gh if not already logged in
if ! gh auth status &>/dev/null; then
  echo "🔑 Authenticating gh CLI"
  echo "$GH_TOKEN" | gh auth login --with-token
else
  echo "✅ gh CLI already authenticated"
fi

# ---------------------------------------------------------------------------
# 8. Pi packages
# ---------------------------------------------------------------------------
PI_PACKAGES=(
  "npm:pi-subagents"
  "npm:@alasano/pi-linear"
  "npm:pi-claude-oauth-adapter"
  "git:github.com/privatedumbo/creampi"
)

for pkg in "${PI_PACKAGES[@]}"; do
  echo "📦 Installing pi package: ${pkg}"
  if ! pi install "$pkg" </dev/null; then
    echo "❌ Failed to install pi package: ${pkg}"
    exit 1
  fi
done

echo "✅ Pi packages installed"

# ---------------------------------------------------------------------------
# 10. Matt Pocock's skills
# ---------------------------------------------------------------------------
echo "📦 Installing Matt Pocock's skills"
npx skills@latest add mattpocock/skills \
  --skill grill-me \
  --skill grill-with-docs \
  --skill improve-codebase-architecture \
  --skill tdd \
  --skill to-prd \
  --global \
  --yes

echo "✅ Matt Pocock's skills installed"

# ---------------------------------------------------------------------------
# 11. Copy .creampi.yaml to home directory
# ---------------------------------------------------------------------------
YAML_FILE="${SCRIPT_DIR}/.creampi.yaml"
if [[ -f "$YAML_FILE" ]]; then
  cp "$YAML_FILE" ~/.creampi.yaml
  echo "✅ .creampi.yaml copied to ~/.creampi.yaml"
else
  echo "⚠️  .creampi.yaml not found at ${YAML_FILE} — skipping"
fi

# ---------------------------------------------------------------------------
# 12. Persist environment variables to .bashrc
# ---------------------------------------------------------------------------
persist_env_var() {
  local var_name="$1"
  local var_value="${!var_name}"
  local marker="export ${var_name}="

  if grep -q "^${marker}" ~/.bashrc 2>/dev/null; then
    # Update existing value
    sed -i "s|^${marker}.*|${marker}\"${var_value}\"|" ~/.bashrc
  else
    echo "${marker}\"${var_value}\"" >> ~/.bashrc
  fi
}

echo "🔧 Persisting environment variables to .bashrc"
persist_env_var ANTHROPIC_API_KEY
persist_env_var LINEAR_API_KEY
persist_env_var GH_TOKEN

echo "✅ Environment variables persisted to .bashrc"

# ---------------------------------------------------------------------------
# 13. Create projects directory
# ---------------------------------------------------------------------------
mkdir -p ~/projects
echo "✅ ~/projects directory ready"

# ---------------------------------------------------------------------------
# 14. Shell tools (starship, eza, fzf, zoxide)
# ---------------------------------------------------------------------------

# starship prompt
if ! command -v starship &>/dev/null; then
  echo "📦 Installing starship"
  curl -sS https://starship.rs/install.sh | sh -s -- -y
else
  echo "✅ starship already installed"
fi

# eza (modern ls)
if ! command -v eza &>/dev/null; then
  echo "📦 Installing eza"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq eza
else
  echo "✅ eza already installed"
fi

# fzf (fuzzy finder)
if ! command -v fzf &>/dev/null; then
  echo "📦 Installing fzf"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fzf
else
  echo "✅ fzf already installed"
fi

# zoxide (smart cd)
if ! command -v zoxide &>/dev/null; then
  echo "📦 Installing zoxide"
  curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
else
  echo "✅ zoxide already installed"
fi

echo "✅ Shell tools installed"

# ---------------------------------------------------------------------------
# 15. Deploy dotfiles
# ---------------------------------------------------------------------------
DOTFILES_DIR="${SCRIPT_DIR}/dotfiles"

if [[ -d "$DOTFILES_DIR" ]]; then
  echo "🔧 Deploying dotfiles"

  # Copy .tmux.conf
  if [[ -f "${DOTFILES_DIR}/.tmux.conf" ]]; then
    cp "${DOTFILES_DIR}/.tmux.conf" "$HOME/.tmux.conf"
    echo "  ✅ .tmux.conf"
  fi

  # Copy .bashrc.d/
  if [[ -d "${DOTFILES_DIR}/.bashrc.d" ]]; then
    mkdir -p "$HOME/.bashrc.d"
    cp "${DOTFILES_DIR}/.bashrc.d/"*.bash "$HOME/.bashrc.d/"
    echo "  ✅ .bashrc.d/ scripts"
  fi

  # Append sourcing loop to .bashrc if not already present
  if ! grep -q 'Source all .bashrc.d scripts' ~/.bashrc 2>/dev/null; then
    cat >> ~/.bashrc << 'BASHRC_D'

# Source all .bashrc.d scripts
if [ -d "$HOME/.bashrc.d" ]; then
  for f in "$HOME/.bashrc.d"/*.bash; do
    [ -r "$f" ] && source "$f"
  done
fi
BASHRC_D
    echo "  ✅ .bashrc.d sourcing loop added"
  else
    echo "  ✅ .bashrc.d sourcing loop already present"
  fi

  echo "✅ Dotfiles deployed"
else
  echo "⚠️  dotfiles/ directory not found at ${DOTFILES_DIR} — skipping"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "🎉 Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Start a tmux session:  tmux new -s tier"
echo "  2. Clone a project:       cd ~/projects && git clone <repo>"
echo "  3. Start pi:              cd <repo> && pi"
echo "  4. Run a tier:            /run-tier ENG-42"
echo "  5. Detach:                Ctrl-b d"
echo "  6. Reattach later:        tmux attach -t tier"
