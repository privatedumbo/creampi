# zoxide smart cd — sourced by ~/.bashrc via .bashrc.d loop

if command -v zoxide &>/dev/null; then
  eval "$(zoxide init bash)"
fi
