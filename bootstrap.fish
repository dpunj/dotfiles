#!/usr/bin/env fish
# Bootstrap script for M1 migration
# Safe to run on a lived-in machine — idempotent, never destructive
#
# Usage: fish ~/dotfiles/bootstrap.fish

set -l GREEN (set_color green)
set -l YELLOW (set_color yellow)
set -l DIM (set_color brblack)
set -l RESET (set_color normal)

function log_ok
    echo "$GREEN✓$RESET $argv"
end

function log_skip
    echo "$DIM⏭ $argv (already exists)$RESET"
end

function log_warn
    echo "$YELLOW⚠ $argv$RESET"
end

# -----------------------------------------------------------
# 1. Homebrew — update & install missing formulae
# -----------------------------------------------------------
echo ""
echo "═══ Homebrew ═══"

if not command -q brew
    echo "Installing Homebrew..."
    /bin/bash -c "(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    log_ok "Homebrew installed, updating..."
    brew update
end

set -l formulae \
    fish fzf zoxide starship delta \
    gh git fd ripgrep ast-grep shellcheck shfmt actionlint zizmor \
    helix fnm jq htop tokei tree \
    libpq redis flyctl ollama

for pkg in $formulae
    if brew list --formula $pkg &>/dev/null
        log_skip $pkg
    else
        echo "  Installing $pkg..."
        brew install $pkg
    end
end

# -----------------------------------------------------------
# 2. Runtimes
# -----------------------------------------------------------
echo ""
echo "═══ Runtimes ═══"

# Node via fnm
if command -q fnm
    set -l node_installed (fnm list 2>/dev/null | string match -r '\d+\.\d+\.\d+' | head -1)
    if test -z "$node_installed"
        echo "  Installing Node LTS via fnm..."
        fnm install --lts
        fnm default lts-latest
    else
        log_ok "Node $node_installed via fnm"
    end
end

# Bun
if command -q bun
    log_ok "bun $(bun --version)"
else
    echo "  Installing bun..."
    curl -fsSL https://bun.sh/install | bash
end

# Rust
if command -q cargo
    log_ok "cargo $(cargo --version | string split ' ')[2]"
else
    echo "  Installing rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
end

# uv (Python)
if command -q uv
    log_ok "uv $(uv --version)"
else
    echo "  Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
end

# -----------------------------------------------------------
# 3. Dotfiles — clone or pull
# -----------------------------------------------------------
echo ""
echo "═══ Dotfiles ═══"

if test -d ~/dotfiles/.git
    log_ok "~/dotfiles exists, pulling latest..."
    git -C ~/dotfiles pull --ff-only
else
    echo "  Cloning dotfiles..."
    git clone git@github.com:dpunj/dotfiles.git ~/dotfiles
end

# -----------------------------------------------------------
# 4. Symlinks — only create if target doesn't exist
# -----------------------------------------------------------
echo ""
echo "═══ Symlinks ═══"

function safe_link --argument-names src dest
    if test -L $dest
        log_skip $dest
    else if test -e $dest
        log_warn "$dest exists (not a symlink) — skipping, review manually"
    else
        set -l parent (dirname $dest)
        mkdir -p $parent
        ln -s $src $dest
        log_ok "$dest → $src"
    end
end

# ~/.config/git/ targets
mkdir -p ~/.config/git
safe_link ~/dotfiles/git/config ~/.config/git/config

# ~/.config/ targets
safe_link ~/dotfiles/fish ~/.config/fish
safe_link ~/dotfiles/ghostty ~/.config/ghostty
safe_link ~/dotfiles/amp ~/.config/amp
safe_link ~/dotfiles/mcp/mcp.json ~/.config/mcp/mcp.json
safe_link ~/dotfiles/starship.toml ~/.config/starship.toml
safe_link ~/dotfiles/AGENTS.md ~/.config/AGENTS.md

# Zed (settings only — Zed manages the rest)
mkdir -p ~/.config/zed
safe_link ~/dotfiles/zed/settings.json ~/.config/zed/settings.json

# Claude Code
mkdir -p ~/.claude
safe_link ~/dotfiles/AGENTS.md ~/.claude/CLAUDE.md
safe_link ~/dotfiles/claude/settings.json ~/.claude/settings.json
safe_link ~/dotfiles/claude/statusline.sh ~/.claude/statusline.sh
safe_link ~/dotfiles/claude/mcp.json ~/.mcp.json

# Pi agent
mkdir -p ~/.pi/agent
safe_link ~/dotfiles/pi/AGENTS.md ~/.pi/agent/AGENTS.md
safe_link ~/dotfiles/pi/settings.json ~/.pi/agent/settings.json
safe_link ~/dotfiles/pi/models.json ~/.pi/agent/models.json
safe_link ~/dotfiles/pi/cloak.json ~/.pi/agent/cloak.json
safe_link ~/dotfiles/pi/extensions ~/.pi/agent/extensions
safe_link ~/dotfiles/pi/prompts ~/.pi/agent/prompts
safe_link ~/dotfiles/pi/themes ~/.pi/agent/themes

# Qwen Code
mkdir -p ~/.qwen
safe_link ~/dotfiles/qwen/settings.json ~/.qwen/settings.json
safe_link ~/dotfiles/AGENTS.md ~/.qwen/QWEN.md

# Kimi Code
mkdir -p ~/.kimi
safe_link ~/dotfiles/kimi/config.toml ~/.kimi/config.toml
safe_link ~/dotfiles/kimi/mcp.json ~/.kimi/mcp.json

# Hermes Agent
mkdir -p ~/.hermes
safe_link ~/dotfiles/hermes/config.yaml ~/.hermes/config.yaml
safe_link ~/dotfiles/hermes/SOUL.md ~/.hermes/SOUL.md

# Skills → Claude Code + Amp + Pi + Codex (Hermes picks up ~/dotfiles/skills/ via external_dirs)
mkdir -p ~/.claude/skills
mkdir -p ~/.pi/agent/skills
mkdir -p ~/.codex/skills
for skill in rams baseline-ui web-interface-guidelines modern-python tdd tmux grill-me improve-codebase-architecture last30days shaping breadboarding explain-diff-html
    safe_link ~/dotfiles/skills/$skill ~/.claude/skills/$skill
    safe_link ~/dotfiles/skills/$skill ~/dotfiles/amp/skills/$skill
    safe_link ~/dotfiles/skills/$skill ~/.pi/agent/skills/$skill
    safe_link ~/dotfiles/codex/skills/$skill ~/.codex/skills/$skill
end

# Global gitignore (ensures local/ is ignored everywhere)
mkdir -p ~/.config/git
if not test -e ~/.config/git/ignore
    echo "local/" >~/.config/git/ignore
    log_ok "Created ~/.config/git/ignore (ignores local/)"
else if not grep -q "local/" ~/.config/git/ignore
    echo "local/" >>~/.config/git/ignore
    log_ok "Added local/ to ~/.config/git/ignore"
else
    log_skip "~/.config/git/ignore already has local/"
end

# -----------------------------------------------------------
# 5. Clone repos into ~/code/
# -----------------------------------------------------------
echo ""
echo "═══ Repos ═══"

mkdir -p ~/code

function clone_repo --argument-names url dirname
    if test -d ~/code/$dirname
        log_skip "~/code/$dirname"
    else
        echo "  Cloning $dirname..."
        git clone $url ~/code/$dirname
    end
end

# versa
clone_repo git@github.com:versa-labs/versa-burgers.git versa-burgers
clone_repo git@github.com:versa-labs/versa-ts.git versa-ts
clone_repo git@github.com:versa-labs/yc-hackathon-26.git yc-hackathon-26

# personal
clone_repo git@github.com:dpunj/changeloz.git changeloz
clone_repo git@github.com:dpunj/aoc-2025.git aoc-25
clone_repo git@github.com:dpunj/blog.git blog
clone_repo git@github.com:dpunj/recrsv.git rlm
clone_repo git@github.com:dpunj/tldraw-mcp.git tldraw-mcp
clone_repo git@github.com:dpunj/xf.git xf
clone_repo git@github.com:dpunj/papelito.git papelito
clone_repo git@github.com:dpunj/spotify.git spotify

# collab
clone_repo git@github.com:fonsiheruz/reply-guy.git reply-guy

# -----------------------------------------------------------
# 7. Ollama — env vars + service
# -----------------------------------------------------------
echo ""
echo "═══ Ollama ═══"

if command -q ollama
    launchctl setenv OLLAMA_FLASH_ATTENTION 1
    launchctl setenv OLLAMA_KV_CACHE_TYPE q8_0
    launchctl setenv OLLAMA_MAX_LOADED_MODELS 2
    launchctl setenv OLLAMA_NUM_PARALLEL 1
    launchctl setenv OLLAMA_KEEP_ALIVE -1
    log_ok "Ollama env vars set via launchctl"

    if brew services list | grep -q "ollama.*started"
        log_skip "ollama service"
    else
        brew services start ollama
        log_ok "Ollama service started"
    end

    for model in qwen3.5:27b qwen3.5:9b
        if ollama list 2>/dev/null | grep -q $model
            log_skip "ollama model $model"
        else
            echo "  Pulling $model..."
            ollama pull $model
        end
    end
else
    log_warn "ollama not found — install failed?"
end

# -----------------------------------------------------------
# 8. Reminders
# -----------------------------------------------------------
echo ""
echo "═══ Manual steps ═══"
echo "  1. Install Berkeley Mono font"
echo "  2. Install apps: Ghostty, Zed, Amp CLI, Claude Code, Kimi, Qwen Code, Hermes Agent"
echo "  3. Install Ollama.app: curl -fsSL https://ollama.com/install.sh | sh"
echo "     Then: open -a Ollama && ollama pull qwen3.5:27b && ollama pull qwen3.5:9b"
echo "     ⚠ Do NOT use brew install ollama (no Metal GPU on M5)"
echo "     ⚠ Do NOT set OLLAMA_FLASH_ATTENTION or OLLAMA_KV_CACHE_TYPE (Metal shader crash)"
echo "  4. Auth: gh auth login"
echo "  5. Auth: agent OAuth flows (Claude, Amp, Kimi, Qwen)"
echo "  6. Auth: MCP tokens (Linear)"
echo "  7. Set fish as default shell: chsh -s (which fish)"
echo "  8. Verify versa-burgers prod deploy still works from this machine!"
echo ""
echo "$GREEN🎉 Bootstrap complete!$RESET"
