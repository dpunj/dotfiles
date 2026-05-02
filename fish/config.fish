# PATH setup (before interactive check so non-interactive shells get it too)
fish_add_path -g /opt/homebrew/bin /opt/homebrew/sbin
fish_add_path -g \
    "$HOME/.local/bin" \
    "$HOME/.amp/bin" \
    "$HOME/.opencode/bin" \
    "$HOME/.cargo/bin" \
    "$HOME/.bun/bin"
fish_add_path -g "$HOME/dotfiles/bin"
fish_add_path -g /opt/homebrew/opt/libpq/bin

# Node.js via fnm (dynamic — no hardcoded version)
if command -q fnm
    fnm env --shell fish 2>/dev/null | source 2>/dev/null
end

set -gx DYLD_FALLBACK_LIBRARY_PATH /opt/homebrew/lib $DYLD_FALLBACK_LIBRARY_PATH

if status is-interactive
    fzf --fish | source
    zoxide init fish | source
    starship init fish | source
end

# Aliases
alias lg lazygit

# Claude Code via local LM Studio
function claude-local
    ANTHROPIC_BASE_URL=http://localhost:1234 \
    ANTHROPIC_AUTH_TOKEN=lmstudio \
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    claude $argv
end

# LM Studio CLI
if test -d "$HOME/.lmstudio/bin"
    fish_add_path -g "$HOME/.lmstudio/bin"
end
