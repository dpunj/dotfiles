# Dotfiles

Personal config files for macOS, managed via symlinks.

**`~/dotfiles/` is the source of truth.** Edit configs here, commit, and push. `~/.config/` just holds symlinks that point back to this repo — never edit files in `~/.config/` directly.

```
~/dotfiles/  (source of truth — git-tracked)
    │
    ├── fish/           ──symlink──▸  ~/.config/fish/
    ├── ghostty/        ──symlink──▸  ~/.config/ghostty/
    ├── amp/            ──symlink──▸  ~/.config/amp/
    ├── zed/settings.json ─symlink─▸  ~/.config/zed/settings.json
    ├── starship.toml   ──symlink──▸  ~/.config/starship.toml
    ├── claude/mcp.json    ──symlink──▸  ~/.mcp.json
    ├── claude/settings.json ─symlink─▸  ~/.claude/settings.json
    ├── claude/statusline.sh ─symlink─▸  ~/.claude/statusline.sh
    ├── qwen/settings.json ─symlink─▸  ~/.qwen/settings.json
    ├── kimi/config.toml ──symlink──▸  ~/.kimi/config.toml
    ├── kimi/mcp.json  ───symlink──▸  ~/.kimi/mcp.json
    ├── AGENTS.md       ──symlink──▸  ~/.config/AGENTS.md
    └── AGENTS.md       ──symlink──▸  ~/.claude/CLAUDE.md
```

## Structure

```
dotfiles/
├── amp/            → ~/.config/amp/
│   ├── settings.json   # Amp agent settings + MCP servers
│   └── skills/         # Custom Amp skills
├── fish/           → ~/.config/fish/
│   ├── config.fish     # Shell config (PATH, interactive tools)
│   ├── completions/    # Custom completions
│   ├── conf.d/         # Auto-sourced config snippets
│   └── functions/      # Custom functions
├── ghostty/        → ~/.config/ghostty/
│   └── config          # Terminal emulator settings
├── zed/
│   └── settings.json   → ~/.config/zed/settings.json
├── claude/         → ~/.claude/
│   ├── mcp.json      # Global MCP servers (→ ~/.mcp.json)
│   ├── settings.json  # Claude Code settings (statusline config)
│   └── statusline.sh  # Two-line minimal statusline script
├── qwen/           → ~/.qwen/
│   └── settings.json  # Qwen Code settings (model: coder-model, oauth)
├── kimi/           → ~/.kimi/
│   ├── config.toml   # Kimi Code settings (model: kimi-for-coding, oauth)
│   └── mcp.json      # MCP servers (context7)
├── starship.toml   → ~/.config/starship.toml
└── AGENTS.md       → ~/.config/AGENTS.md + ~/.claude/CLAUDE.md
```

## Agent Instructions (`AGENTS.md`)

All coding agents share a single `AGENTS.md` for instructions, symlinked per agent:

| Agent | Reads from | Symlink |
|-------|-----------|---------|
| Claude Code | `~/.claude/CLAUDE.md` | `~/dotfiles/AGENTS.md` → `~/.claude/CLAUDE.md` |
| Amp | `~/.config/AGENTS.md` | `~/dotfiles/AGENTS.md` → `~/.config/AGENTS.md` |
| Kimi Code | `AGENTS.md` in working dir | Reads `~/dotfiles/AGENTS.md` directly |

## Installation

Run these commands to symlink configs to `~/.config/`:

```fish
# Fish shell (entire directory)
ln -s ~/dotfiles/fish ~/.config/fish

# Ghostty (entire directory)
ln -s ~/dotfiles/ghostty ~/.config/ghostty

# Amp (entire directory)
ln -s ~/dotfiles/amp ~/.config/amp

# Starship prompt
ln -s ~/dotfiles/starship.toml ~/.config/starship.toml

# Zed (settings file only — Zed manages the rest of ~/.config/zed/)
mkdir -p ~/.config/zed
ln -s ~/dotfiles/zed/settings.json ~/.config/zed/settings.json

# AGENTS.md (global agent instructions — Amp reads ~/.config/AGENTS.md)
ln -s ~/dotfiles/AGENTS.md ~/.config/AGENTS.md

# Claude Code reads ~/.claude/CLAUDE.md (symlink to same file)
ln -s ~/dotfiles/AGENTS.md ~/.claude/CLAUDE.md

# Claude Code settings + statusline + global MCP servers
ln -s ~/dotfiles/claude/mcp.json ~/.mcp.json
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/statusline.sh ~/.claude/statusline.sh

# Qwen Code settings
mkdir -p ~/.qwen
ln -s ~/dotfiles/qwen/settings.json ~/.qwen/settings.json

# Kimi Code settings + MCP servers
ln -s ~/dotfiles/kimi/config.toml ~/.kimi/config.toml
ln -s ~/dotfiles/kimi/mcp.json ~/.kimi/mcp.json
```

## What's Configured

### Fish (`fish/config.fish`)

**PATH additions:**
- `/opt/homebrew/bin`, `/opt/homebrew/sbin` — Homebrew
- `~/.local/bin` — pip, pipx, cargo installs
- `~/.amp/bin` — Amp CLI
- `~/.opencode/bin` — OpenCode CLI
- `~/.nvm/versions/node/v24.1.0/bin` — Node.js (via nvm)

**Interactive tools:**
- `fzf` — Fuzzy finder keybindings
- `zoxide` — Smart cd (`z` command)
- `starship` — Prompt theme

### Ghostty (`ghostty/config`)

- Font: Berkeley Mono @ 14pt
- Default shell: fish

### Zed (`zed/settings.json`)

- Theme: One Light / macOS Classic Dark (system mode)
- Font: Berkeley Mono @ 15pt
- Helix keybindings enabled
- Agent: Claude Opus 4.5 / Sonnet 4.5

### Amp (`amp/settings.json`)

- MCP servers (`amp.mcpServers`): context7, linear, sentry, tldraw

### Claude Code (`claude/`)

- Two-line statusline: model/folder/branch + context bar/cost/duration
- Context bar goes dim `░` → solid `█` as context fills up
- Global MCP servers (`mcp.json` → `~/.mcp.json`): context7
- Add project-specific servers to `.mcp.json` in the project root

### Qwen Code (`qwen/`)

- Model: `coder-model` (via OAuth)

### Kimi Code (`kimi/`)

- Model: `kimi-for-coding` (Kimi K2.5, 262k context, via OAuth)
- Thinking mode enabled by default
- MCP servers (`mcp.json` → `~/.kimi/mcp.json`): context7

### Starship (`starship.toml`)

Currently using defaults (empty config).

## Dependencies

Install these via Homebrew:

```fish
brew install fish fzf zoxide starship
```

## Docs

- [Claude Code](https://code.claude.com/docs) — [MCP](https://code.claude.com/docs/en/mcp)
- [Amp](https://ampcode.com/manual) — [MCP](https://ampcode.com/manual#mcp)
- [Kimi Code](https://moonshotai.github.io/kimi-cli/) — [MCP](https://moonshotai.github.io/kimi-cli/en/customization/mcp.html)
- [Qwen Code](https://qwenlm.github.io/qwen-code-docs/en/)

## Notes

- Zed recreates `~/.config/zed/` on launch, so only `settings.json` is symlinked (not the whole directory).
- Node.js is managed via nvm with a hardcoded path. If you upgrade node, update the path in `fish/config.fish`.
- Kimi Code credentials live in `~/.kimi/credentials/` (not tracked). Install via `curl -L code.kimi.com/install.sh | bash`.
