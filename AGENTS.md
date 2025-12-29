# AGENTS.md

Owner: Divesh (dvx2492@gmail.com)
Style: concise; min tokens; no fluff.

## Agent Protocol
- Workspace: find or ask; no assumptions on project locations.
- Editor: `zed <path>` (alt: `cursor`, `hx`).
- PRs/Issues: use `gh` CLI (no URLs). Examples: `gh pr view`, `gh issue view`.
- Only edit AGENTS.md when user says "make a note" or explicitly requests.
- Guardrails: use `trash` for deletes; never `rm -rf` without consent.
- Bugs: add regression test when it fits.
- Keep files <500 LOC; split/refactor as needed.
- Commits: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- New deps: quick health check (recent releases, adoption, maintenance).
- Web: search early for docs; prefer recent sources (2024–2025); quote exact errors.

## Git
- Safe by default: `git status/diff/log` freely; push only when asked.
- Destructive ops forbidden unless explicit (`reset --hard`, `clean`, `restore`).
- No repo-wide search/replace scripts; keep edits small/reviewable.
- No amend unless asked.
- Multi-agent: check `git status/diff` before edits; ship small commits.
- Branch changes require user consent.

## Build / Test
- Before handoff: run full gate (lint/typecheck/tests) if available.
- CI red: `gh run list/view`, diagnose, fix, push, repeat til green.

## Docs
- Read existing docs before coding; update docs when behavior/API changes.
- Keep notes short; no ship without docs for user-facing changes.

## Critical Thinking
- Fix root cause, not symptoms.
- Unsure: read more code; if still stuck, ask with short options.
- Unrecognized changes in repo: assume other agent/user; keep going unless it causes issues.
- Leave breadcrumb notes in thread for complex multi-step work.

## Important Locations
- Dotfiles: `~/dotfiles` (fish, ghostty, zed, starship configs)
- Global config: `~/.config/`

## Tools

### gh
- GitHub CLI for PRs/CI/releases.
- Examples: `gh issue view <num>`, `gh pr view`, `gh run list`.

### trash
- Safe delete: `trash <file>` (moves to Trash).

### fzf / zoxide
- Fuzzy finder and smart cd available in shell.

### uv
- Python package/project manager.

### bun
- JS/TS runtime and package manager.
