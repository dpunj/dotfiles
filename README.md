# Dotfiles

Personal config files for macOS, managed via symlinks.

**`~/dotfiles/` is the source of truth.** Edit configs here, commit, and push. Target paths (`~/.config/`, `~/.claude/`, etc.) just hold symlinks that point back to this repo — never edit files there directly.

## Structure

```
dotfiles/
│
│  # ~/.config/ targets
├── amp/              → ~/.config/amp/
│   ├── settings.json     # Amp agent settings + MCP servers
│   └── skills/           # Custom Amp skills (symlinks → skills/ + amp/skills/)
│       └── obsidian-markdown/   # Obsidian Flavored Markdown reference
├── fish/             → ~/.config/fish/
│   ├── config.fish       # Shell config (PATH, interactive tools)
│   ├── completions/      # Custom completions
│   ├── conf.d/           # Auto-sourced config snippets
│   └── functions/        # Custom functions
├── ghostty/          → ~/.config/ghostty/
│   └── config            # Terminal emulator settings
├── zed/settings.json → ~/.config/zed/settings.json
├── starship.toml     → ~/.config/starship.toml
│
│  # Agent dotdir targets (~/.pi/, ~/.claude/, ~/.qwen/, ~/.kimi/, ~/.hermes/)
├── hermes/           → ~/.hermes/ (files symlinked individually)
│   ├── config.yaml      → ~/.hermes/config.yaml
│   └── SOUL.md          → ~/.hermes/SOUL.md
├── pi/               → ~/.pi/agent/ (files + dirs symlinked individually)
│   ├── AGENTS.md         → ~/.pi/agent/AGENTS.md
│   ├── settings.json     → ~/.pi/agent/settings.json
│   ├── cloak.json        → ~/.pi/agent/cloak.json
│   ├── extensions/       → ~/.pi/agent/extensions/
│   │   ├── auto-session-name.ts  # Auto-names sessions from first message
│   │   ├── compact-header.ts     # Compact chat header
│   │   ├── custom-footer.ts      # Enhanced status bar (tokens, cost, context%, timer)
│   │   ├── git-guard.ts          # Git completion notifications + dirty-repo warning
│   │   ├── git-interceptor.ts    # Git editor-hang prevention + --no-verify blocking
│   │   ├── safe-guard.ts         # File safety guardrails
│   │   ├── pi-cloak/             # Redacts configured secrets from read tool output
│   │   └── music/                # Music player extension
│   ├── prompts/          → ~/.pi/agent/prompts/
│   │   ├── commit.md    fix.md    review.md
│   │   ├── explain.md   test.md
│   └── themes/
│       ├── twilight-ocean.json   # Active blue ocean/twilight theme
│       └── ocean-breeze.json     # Earlier custom ocean theme
├── claude/               (files symlinked individually)
│   ├── mcp.json          → ~/.mcp.json
│   ├── settings.json     → ~/.claude/settings.json
│   └── statusline.sh    → ~/.claude/statusline.sh
├── qwen/             → ~/.qwen/
│   └── settings.json     # Qwen Code settings + context config
├── kimi/             → ~/.kimi/
│   ├── config.toml       # Kimi Code settings
│   └── mcp.json          # MCP servers (context7)
├── codex/
│   └── skills/           # Symlinks → ~/.codex/skills/
│       ├── baseline-ui/  # Shared dotfiles skill
│       └── obsidian-*    # Vault-owned Obsidian skills from ~/notes/.amp/skills/
│
│  # Skills (source of truth, symlinked to agent skill directories)
├── skills/
│   ├── rams/                        # A11y + visual design review (scored)
│   ├── baseline-ui/                 # Anti-AI-slop UI constraints
│   ├── web-interface-guidelines/    # Vercel's 80+ web UI rules
│   ├── modern-python/               # Python tooling guide (uv, ruff, ty)
│   ├── tdd/                         # Test-driven development workflow
│   └── tmux/                        # Remote-control interactive CLI sessions
│
│  # Shared across agents
└── AGENTS.md         → ~/.config/AGENTS.md + ~/.claude/CLAUDE.md
```

## Agent Instructions (`AGENTS.md`)

All coding agents share a single `AGENTS.md` — one file, symlinked per agent:

| Agent | Reads from | Symlink |
|-------|-----------|---------|
| Pi | `~/.pi/agent/AGENTS.md` | `~/dotfiles/pi/AGENTS.md` → `~/.pi/agent/AGENTS.md` (pi-specific, not global) |
| Claude Code | `~/.claude/CLAUDE.md` | `~/dotfiles/AGENTS.md` → `~/.claude/CLAUDE.md` |
| Amp | `~/.config/AGENTS.md` | `~/dotfiles/AGENTS.md` → `~/.config/AGENTS.md` |
| Qwen Code | `~/.qwen/QWEN.md` | `~/dotfiles/AGENTS.md` → `~/.qwen/QWEN.md` |
| Kimi Code | `AGENTS.md` in working dir | Reads `~/dotfiles/AGENTS.md` directly |
| Hermes Agent | `~/.hermes/SOUL.md` | `~/dotfiles/hermes/SOUL.md` → `~/.hermes/SOUL.md` (persona only — dev standards via shared skills) |

### `local/` scratch directory

Every repo can have a `local/` directory for agent scratch space (shaping docs, spikes, plans, debug output). It's globally gitignored via `~/.config/git/ignore` but accessible to all agents and editors:

| Tool | How `local/` is discovered |
|------|---------------------------|
| **Amp** | `amp.fuzzy.alwaysIncludePaths: ["local/**"]` in settings.json |
| **Zed** | `file_scan_inclusions: ["local/**"]` + `search.include_ignored: true` |
| **Claude/Kimi/Qwen** | Read any file on disk when asked — AGENTS.md instructs them to check `local/docs/` proactively |

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

# Pi (symlink individual files + directories into ~/.pi/agent/)
ln -s ~/dotfiles/pi/AGENTS.md ~/.pi/agent/AGENTS.md
ln -s ~/dotfiles/pi/settings.json ~/.pi/agent/settings.json
ln -s ~/dotfiles/pi/cloak.json ~/.pi/agent/cloak.json
ln -s ~/dotfiles/pi/extensions ~/.pi/agent/extensions
ln -s ~/dotfiles/pi/prompts ~/.pi/agent/prompts
ln -s ~/dotfiles/pi/themes ~/.pi/agent/themes

# Claude Code reads ~/.claude/CLAUDE.md (symlink to same file)
ln -s ~/dotfiles/AGENTS.md ~/.claude/CLAUDE.md

# Claude Code settings + statusline + global MCP servers
ln -s ~/dotfiles/claude/mcp.json ~/.mcp.json
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/statusline.sh ~/.claude/statusline.sh

# Qwen Code settings + global instructions
mkdir -p ~/.qwen
ln -s ~/dotfiles/qwen/settings.json ~/.qwen/settings.json
ln -s ~/dotfiles/AGENTS.md ~/.qwen/QWEN.md

# Kimi Code settings + MCP servers
ln -s ~/dotfiles/kimi/config.toml ~/.kimi/config.toml
ln -s ~/dotfiles/kimi/mcp.json ~/.kimi/mcp.json

# Hermes Agent
mkdir -p ~/.hermes
ln -s ~/dotfiles/hermes/config.yaml ~/.hermes/config.yaml
ln -s ~/dotfiles/hermes/SOUL.md ~/.hermes/SOUL.md

# Shared skills (symlink to Pi, Claude Code, Codex + Amp)
ln -s ~/dotfiles/skills/rams ~/.pi/agent/skills/rams
ln -s ~/dotfiles/skills/baseline-ui ~/.pi/agent/skills/baseline-ui
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.pi/agent/skills/web-interface-guidelines
ln -s ~/dotfiles/skills/tdd ~/.pi/agent/skills/tdd
ln -s ~/dotfiles/skills/tmux ~/.pi/agent/skills/tmux
ln -s ~/dotfiles/skills/rams ~/.claude/skills/rams
ln -s ~/dotfiles/skills/baseline-ui ~/.claude/skills/baseline-ui
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.claude/skills/web-interface-guidelines
ln -s ~/dotfiles/skills/tdd ~/.claude/skills/tdd
ln -s ~/dotfiles/skills/tmux ~/.claude/skills/tmux
ln -s ~/dotfiles/codex/skills/baseline-ui ~/.codex/skills/baseline-ui
ln -s ~/dotfiles/codex/skills/grill-me ~/.codex/skills/grill-me
ln -s ~/dotfiles/codex/skills/improve-codebase-architecture ~/.codex/skills/improve-codebase-architecture
ln -s ~/dotfiles/codex/skills/modern-python ~/.codex/skills/modern-python
ln -s ~/dotfiles/codex/skills/rams ~/.codex/skills/rams
ln -s ~/dotfiles/codex/skills/tdd ~/.codex/skills/tdd
ln -s ~/dotfiles/codex/skills/tmux ~/.codex/skills/tmux
ln -s ~/dotfiles/codex/skills/web-interface-guidelines ~/.codex/skills/web-interface-guidelines
ln -s ~/dotfiles/skills/rams ~/dotfiles/amp/skills/rams
ln -s ~/dotfiles/skills/baseline-ui ~/dotfiles/amp/skills/baseline-ui
ln -s ~/dotfiles/skills/web-interface-guidelines ~/dotfiles/amp/skills/web-interface-guidelines
ln -s ~/dotfiles/skills/tdd ~/dotfiles/amp/skills/tdd
ln -s ~/dotfiles/skills/tmux ~/dotfiles/amp/skills/tmux

# Obsidian skills (source of truth: ~/notes/.amp/skills/)
ln -s ~/dotfiles/amp/skills/obsidian-markdown ~/.config/amp/skills/obsidian-markdown
ln -s ~/dotfiles/codex/skills/defuddle ~/.codex/skills/defuddle
ln -s ~/dotfiles/codex/skills/obsidian-markdown ~/.codex/skills/obsidian-markdown
ln -s ~/dotfiles/codex/skills/obsidian-bases ~/.codex/skills/obsidian-bases
ln -s ~/dotfiles/codex/skills/obsidian-cli ~/.codex/skills/obsidian-cli
ln -s ~/dotfiles/codex/skills/json-canvas ~/.codex/skills/json-canvas
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

- `amp.fuzzy.alwaysIncludePaths: ["local/**"]` — exposes gitignored `local/` to fuzzy search
- MCP servers (`amp.mcpServers`): context7, linear, tldraw

### Pi (`pi/`)

- Model: Claude Opus 4.6 via Anthropic, thinking level high
- Theme: `twilight-ocean` (custom blue ocean/twilight palette)
- Packages: `@ifi/oh-pi-themes` (community themes), `pi-interactive-shell` (agent overlay), `pi-mcp-adapter` (lazy MCP bridge)
- MCP servers: shared `mcp/mcp.json` → `~/.config/mcp/mcp.json` includes Linear via `mcp-remote`
- Extensions:
  - `custom-footer.ts` — single-line status bar with color-coded cost/context% (muted → warning → error)
  - `compact-header.ts` — minimal chat header
  - `auto-session-name.ts` — names sessions from first message
  - `git-guard.ts` / `git-interceptor.ts` / `safe-guard.ts` — safety guardrails for git, shell, and file ops
  - `pi-cloak/` + `cloak.json` — redacts configured secrets from `read` tool output
  - `music/` — music player
- Prompt templates: `commit`, `explain`, `fix`, `review`, `test`
- Skills: shared from `~/dotfiles/skills/` (rams, baseline-ui, web-interface-guidelines, tdd, tmux)

### Claude Code (`claude/`)

- Two-line statusline: model/folder/branch + context bar/cost/duration
- Context bar goes dim `░` → solid `█` as context fills up
- Global MCP servers (`mcp.json` → `~/.mcp.json`): context7
- Add project-specific servers to `.mcp.json` in the project root

### Codex (`codex/`)

- Skills in `codex/skills/` are symlink targets for `~/.codex/skills/`
- Shared skills point back to `~/dotfiles/skills/`
- Obsidian skills point to `~/notes/.amp/skills/`, so Amp, Claude, and Codex use the same vault-owned skill definitions
- Restart Codex after adding or changing skill symlinks so the native skill registry refreshes

### Qwen Code (`qwen/`)

- Model: `coder-model` (via OAuth)
- Context files: reads `QWEN.md` and `AGENTS.md` from project dirs (via `context.fileName`)
- Global instructions: `~/dotfiles/AGENTS.md` → `~/.qwen/QWEN.md`
- MCP servers: context7, linear, sentry, tldraw

### Kimi Code (`kimi/`)

- Model: `kimi-for-coding` (Kimi K2.5, 262k context, via OAuth)
- Thinking mode enabled by default
- MCP servers (`mcp.json` → `~/.kimi/mcp.json`): context7

### Hermes Agent (`hermes/`)

- Model: Claude Opus 4.6 via Anthropic
- Persona: `SOUL.md` — minimal, direct, terminal-native
- Shared skills: picks up `~/dotfiles/skills/` via `skills.external_dirs` in config.yaml
- MCP servers: configured in `config.yaml` under `mcp_servers` key (none yet)
- Memory: persistent across sessions (`~/.hermes/memories/` — not symlinked, runtime state)
- API keys: `~/.hermes/.env` (not symlinked — sensitive)

### [Skills](./skills/) (`skills/`)

Reusable capabilities for Pi, Claude Code (`/skill`), and Amp. All skills live in `~/dotfiles/skills/` and are symlinked to agent-specific directories.

#### Design & UI Review

| Skill | Source | What it does | When to use |
|-------|--------|-------------|-------------|
| **rams** | [rams.ai](https://rams.ai) | WCAG 2.1 accessibility + visual design review with scored output | Reviewing components for a11y violations, visual inconsistencies, missing states |
| **baseline-ui** | [ibelick/ui-skills](https://github.com/ibelick/ui-skills) | Opinionated anti-AI-slop constraints (Tailwind, motion, a11y) | Starting UI work—apply these constraints before generating any code |
| **web-interface-guidelines** | [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | Comprehensive web UI compliance (80+ rules) | Detailed compliance check covering forms, animation, typography, perf, i18n, hydration |

These three complement each other:
- **baseline-ui** prevents slop at generation time (guardrails)
- **rams** scores existing components with actionable fixes
- **web-interface-guidelines** is the complete rulebook for production polish

#### Development

| Skill | Source | What it does | When to use |
|-------|--------|-------------|-------------|
| **modern-python** | — | Modern Python tooling guide (uv, ruff, ty) | Creating Python projects, writing scripts, migrating from pip/poetry/mypy/black |
| **tdd** | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/tdd) | Red-green-refactor workflow for building features or fixing bugs one vertical slice at a time | When you want test-first implementation with behavior-focused tests |
| **tmux** | [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff) | Private-socket tmux workflow for driving interactive CLIs and long-running processes | When a dev server, REPL, debugger, or TTY program needs controlled interactive monitoring |
| **obsidian-markdown** | [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Obsidian Flavored Markdown reference (wikilinks, embeds, callouts, properties) | Working with .md files in Obsidian vaults |

**Quick usage:**
```bash
# In Pi
/skill:tdd
/skill:baseline-ui
/skill:tmux

# In Claude Code
/skill rams src/Button.tsx
/skill baseline-ui
/skill modern-python
/skill tdd
/skill tmux

# In Amp
@rams src/Button.tsx
@baseline-ui
@modern-python
@tdd
@tmux
```

### Starship (`starship.toml`)

Currently using defaults (empty config).

## Dependencies

Install these via Homebrew:

```fish
brew install fish fzf zoxide starship
```

## Docs

- [Pi](https://github.com/badlogic/pi-mono) — [Themes](docs/themes.md) · [Extensions](docs/extensions.md) · [Skills](docs/skills.md)
- [Claude Code](https://code.claude.com/docs) — [Skills](https://code.claude.com/docs/en/skills) · [MCP](https://code.claude.com/docs/en/mcp)
- [Amp](https://ampcode.com/manual) — [Skills](https://ampcode.com/manual#skills) · [MCP](https://ampcode.com/manual#mcp)
- [Kimi Code](https://moonshotai.github.io/kimi-cli/) — [MCP](https://moonshotai.github.io/kimi-cli/en/customization/mcp.html)
- [Qwen Code](https://qwenlm.github.io/qwen-code-docs/en/)

## Notes

- Zed recreates `~/.config/zed/` on launch, so only `settings.json` is symlinked (not the whole directory).
- Node.js is managed via nvm with a hardcoded path. If you upgrade node, update the path in `fish/config.fish`.
- Kimi Code credentials live in `~/.kimi/credentials/` (not tracked). Install via `curl -L code.kimi.com/install.sh | bash`.
