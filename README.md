# Dotfiles

Personal config files for macOS, managed via symlinks.

## Structure

```
dotfiles/
├── fish/           → ~/.config/fish/
│   ├── config.fish     # Shell config (PATH, interactive tools)
│   ├── completions/    # Custom completions
│   ├── conf.d/         # Auto-sourced config snippets
│   └── functions/      # Custom functions
├── ghostty/        → ~/.config/ghostty/
│   └── config          # Terminal emulator settings
├── zed/
│   └── settings.json   → ~/.config/zed/settings.json
└── starship.toml   → ~/.config/starship.toml
```

## Installation

Run these commands to symlink configs to `~/.config/`:

```fish
# Fish shell (entire directory)
ln -s ~/dotfiles/fish ~/.config/fish

# Ghostty (entire directory)
ln -s ~/dotfiles/ghostty ~/.config/ghostty

# Starship prompt
ln -s ~/dotfiles/starship.toml ~/.config/starship.toml

# Zed (settings file only — Zed manages the rest of ~/.config/zed/)
mkdir -p ~/.config/zed
ln -s ~/dotfiles/zed/settings.json ~/.config/zed/settings.json
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

### Starship (`starship.toml`)

Currently using defaults (empty config).

## Dependencies

Install these via Homebrew:

```fish
brew install fish fzf zoxide starship
```

## Notes

- Zed recreates `~/.config/zed/` on launch, so only `settings.json` is symlinked (not the whole directory).
- Node.js is managed via nvm with a hardcoded path. If you upgrade node, update the path in `fish/config.fish`.
