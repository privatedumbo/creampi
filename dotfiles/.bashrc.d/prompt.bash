# Starship prompt — sourced by ~/.bashrc via .bashrc.d loop

if command -v starship &>/dev/null; then
  eval "$(starship init bash)"
fi
