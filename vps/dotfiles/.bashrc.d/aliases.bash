# Shell aliases — sourced by ~/.bashrc via .bashrc.d loop

# Directory listing (eza if available, fallback to ls)
if command -v eza &>/dev/null; then
  alias ls='eza --color=auto'
  alias ll='eza -l --icons --group-directories-first'
  alias la='eza -la --icons --group-directories-first'
  alias lt='eza --tree --icons --level=3'
else
  alias ll='ls -lF --color=auto'
  alias la='ls -laF --color=auto'
fi

# Git shortcuts
alias gs='git status'
alias gd='git diff'
alias gc='git commit'
alias ga='git add'
alias gl='git log --oneline -20'
alias gp='git push'
