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

## Shaping Workflow (Shape Up)

Use Ryan Singer's Shape Up methodology for all non-trivial features. Load the `shaping` and `breadboarding` skills before starting.

**Reference:** [rjs/shaping-skills](https://github.com/rjs/shaping-skills), [Shaping 0-1 walkthrough](https://x.com/rjs/status/2020184079350563263), [rjs/tick](https://github.com/rjs/tick) (canonical example output).

### The Loop (Singer's workflow)

1. **Describe** what's in your head — dump the vision, ask to "capture the requirements and tease apart the key parts of the solution A"
2. **`show me R x A`** — fit check: requirements vs shape. Jump-in point to see what's solved/unsolved
3. **`show me A x R`** — rotate: each part against all R. Reveals what to spike next
4. **`spike A2`** — dig into unknowns. Spikes often revise R, not just A
5. **`breadboard A`** — wire into concrete UI + code affordances (one circuit)
6. **`slice it`** — cut into vertical demo-able scopes (max 9 slices)
7. **Build slice by slice** — "make an implementation plan for V1, include how you will test it"

### Document Rules

**One `shaping.md` per feature.** Everything lives in one file: Frame (Source/Problem/Outcome) → R → Shapes → Fit Check → Breadboard (tables + Mermaid + wiring narrative) → Slices. This is the ground truth. Only spikes and individual slice plans get separate files.

**File naming and location** (in `local/docs/`, which is globally gitignored):
- `local/docs/{feature}-shaping.md` — the shaping doc (ground truth)
- `local/docs/{feature}-spike-{part}.md` — spike investigations
- `local/docs/{feature}-v{n}-plan.md` — individual slice implementation plans
- `local/docs/{feature}-big-picture.md` — summary view (created after shape is selected)

**Shaping docs are permanent.** They are architectural decision records. Don't delete after shipping — they explain *why* the system is the way it is. When revisiting a feature, start from the existing shaping doc.

**Singer's shorthand commands:**

| Command | What it does |
|---------|-------------|
| `show me R x A` | Fit check: requirements vs shape A |
| `show me A x R` | Rotated fit check: each part of A against all R |
| `spike A2` | Investigate the unknown in part A2 |
| `breadboard A` | Wire shape A into concrete UI + code affordances |
| `slice it` | Cut the breadboard into vertical demo-able scopes |
| `let's update A with Approach 1` | Incorporate spike findings into the shape |

### Key Principles

- **Separate R from S.** R states the need (solution-agnostic). S describes the mechanism. If R reads like a solution, it belongs in S.
- **Fit check is binary.** ✅ or ❌. No ⚠️ in fit checks — ⚠️ belongs in the Parts table Flag column only.
- **Flagged unknowns (⚠️) fail the fit check.** You can't claim ✅ for something you don't know how to build.
- **Spikes ask mechanics, not effort.** "Where is X?", "What changes are needed?", not "How long will this take?"
- **Every slice must have demo-able UI.** No horizontal layers ("set up all the data models"). Each slice cuts through all layers.
- **Breadboard tables are the truth, Mermaid is visualization.** Changes flow from tables → diagram, never reverse.
- **Include a wiring narrative.** Plain-English "Startup flow:" and "Command flow:" alongside the Mermaid diagram.

## Important Locations
- Dotfiles: `~/dotfiles` (fish, ghostty, zed, starship configs)
- Global config: `~/.config/`
- Global gitignore: `~/.config/git/ignore`
- `local/` dir in any repo is globally gitignored — use for agent scratch space (debug logs, plans, large reference files). Never committed.

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
