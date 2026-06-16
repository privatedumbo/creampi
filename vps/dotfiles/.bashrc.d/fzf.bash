# fzf keybindings and completion — sourced by ~/.bashrc via .bashrc.d loop

if command -v fzf &>/dev/null; then
  # Set up keybindings (Ctrl+R for history, Ctrl+T for files, Alt+C for cd)
  if [[ -f /usr/share/doc/fzf/examples/key-bindings.bash ]]; then
    source /usr/share/doc/fzf/examples/key-bindings.bash
  elif [[ -f "${HOME}/.fzf/shell/key-bindings.bash" ]]; then
    source "${HOME}/.fzf/shell/key-bindings.bash"
  fi

  # Set up completion
  if [[ -f /usr/share/doc/fzf/examples/completion.bash ]]; then
    source /usr/share/doc/fzf/examples/completion.bash
  elif [[ -f "${HOME}/.fzf/shell/completion.bash" ]]; then
    source "${HOME}/.fzf/shell/completion.bash"
  fi

  # Use eza for preview if available
  if command -v eza &>/dev/null; then
    export FZF_ALT_C_OPTS="--preview 'eza --tree --icons --level=2 {}'"
  fi
fi
