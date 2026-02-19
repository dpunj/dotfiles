# Global Development Standards

Global instructions for all projects. Project-specific AGENTS.md/CLAUDE.md files override these defaults.

Owner: Divesh (dvx2492@gmail.com)

## Philosophy

- **No speculative features** — Don't add features, flags, or configuration unless actively needed. No stub endpoints, placeholder configs, or "TODO: later" interfaces
- **No premature abstraction** — Don't create utilities until you've written the same code three times
- **Clarity over cleverness** — Prefer explicit, readable code over dense one-liners
- **Replace, don't deprecate** — When a new implementation replaces an old one, remove the old one entirely. No backward-compatible shims or dual config formats. Proactively flag dead code
- **Justify new dependencies** — Each dependency is attack surface and maintenance burden. Quick health check (recent releases, adoption, maintenance) before adding
- **Verify at every level** — Set up automated guardrails (linters, type checkers, tests) as the first step. Prefer structure-aware tools (ast-grep, LSPs, compilers) over text pattern matching
- **Bias toward action** — Decide and move for anything easily reversed; state your assumption so the reasoning is visible. Ask before committing to interfaces, data models, architecture, or destructive/write operations
- **Finish the job** — Handle the edge cases you can see, clean up what you touched. If something is broken adjacent to your change, flag it. But don't invent new scope
- **Fix root cause, not symptoms** — Unsure: read more code; if still stuck, ask with short options
- **Agent-native by default** — Prefer workflows agents can read and run. Write plans in `local/docs/`, leave breadcrumbs in threads, use file-based state for transparency. Don't rely on private memory or context

## Code Quality

### Hard limits

1. ≤100 lines/function, cyclomatic complexity ≤8
2. ≤5 positional params
3. 100-char line length
4. Absolute imports only — no relative (`..`) paths
5. Google-style docstrings on non-trivial public APIs
6. Keep files <500 LOC; split/refactor as needed

### Zero warnings policy

Fix every warning from every tool — linters, type checkers, compilers, tests. If a warning truly can't be fixed, add an inline ignore with a justification comment. Never leave warnings unaddressed.

### Comments

Code should be self-documenting. No commented-out code — delete it. If you need a comment to explain WHAT the code does, refactor the code instead.

### Error handling

- Fail fast with clear, actionable messages
- Never swallow exceptions silently
- Include context (what operation, what input, suggested fix)

### Testing

- **Test behavior, not implementation** — If a refactor breaks your tests but not your code, the tests were wrong
- **Test edges and errors** — Empty inputs, boundaries, malformed data, missing files. Every error path should have a test
- **Mock boundaries, not logic** — Only mock things that are slow (network, filesystem), non-deterministic (time, randomness), or external services
- **Verify tests catch failures** — Break the code, confirm the test fails, then fix. Use mutation testing (`mutmut`, `cargo-mutants`) selectively for critical logic
- **Property-based tests for invariant-driven logic** — Parsers, serializers, validators, state machines. Tools: `hypothesis` (Python), `proptest` (Rust)
- **Bugs: add regression test** when it fits

## Agent Protocol

- Workspace: find or ask; no assumptions on project locations.
- Editor: `zed <path>` (alt: `cursor`, `hx`).
- PRs/Issues: use `gh` CLI (no URLs). Examples: `gh pr view`, `gh issue view`.
- Only edit AGENTS.md when user says "make a note" or explicitly requests.
- Guardrails: use `trash` for deletes; never `rm -rf` without consent.
- Commits: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- Web: search early for docs; prefer recent sources (2024–2025); quote exact errors.
- Unrecognized changes in repo: assume other agent/user; keep going unless it causes issues.
- Leave breadcrumb notes in thread for complex multi-step work.

## Git

- Safe by default: `git status/diff/log` freely; push only when asked.
- Destructive ops forbidden unless explicit (`reset --hard`, `clean`, `restore`).
- No repo-wide search/replace scripts; keep edits small/reviewable.
- No amend unless asked. Never amend/rebase commits already pushed to shared branches.
- Multi-agent: check `git status/diff` before edits; ship small commits. Use `git worktree` for parallel workstreams so each agent has an isolated working directory.
- Branch changes require user consent.
- Never commit secrets, API keys, or credentials — use `.env` files (gitignored).
- Never push directly to main — use feature branches and PRs.

## Development

When adding dependencies, CI actions, or tool versions, always look up the current stable version — never assume from memory.

### CLI tools

| tool | replaces | usage |
|------|----------|-------|
| `rg` (ripgrep) | grep | `rg "pattern"` — fast regex search |
| `fd` | find | `fd "*.py"` — fast file finder |
| `ast-grep` | — | `ast-grep --pattern '$FUNC($$$)' --lang py` — AST-based code search |
| `shellcheck` | — | `shellcheck script.sh` — shell script linter |
| `shfmt` | — | `shfmt -i 2 -w script.sh` — shell formatter |
| `actionlint` | — | `actionlint .github/workflows/` — GitHub Actions linter |
| `zizmor` | — | `zizmor .github/workflows/` — Actions security audit |
| `trash` | rm | `trash file` — moves to macOS Trash (recoverable). **Never use `rm -rf`** |

Prefer `ast-grep` over ripgrep when searching for code structure (function calls, class definitions, imports). Use ripgrep for literal strings and log messages.

### Python

**Runtime:** 3.13 with `uv venv`

| purpose | tool |
|---------|------|
| deps & venv | `uv` |
| lint & format | `ruff check` · `ruff format` |
| static types | `ty check` |
| tests | `pytest -q` |

Always use `uv`, `ruff`, and `ty` over pip/poetry, black/pylint/flake8, and mypy/pyright. Supply chain: `pip-audit` before deploying, pin exact versions.

### Node/TypeScript

**Runtime:** Node 22 LTS, ESM only (`"type": "module"`)

| purpose | tool |
|---------|------|
| package manager | `bun` |
| lint | `oxlint` (fallback: `eslint`). Enable `typescript`, `import`, `unicorn` plugins |
| format | `oxfmt` (fallback: `prettier`) |
| test | `vitest` |
| types | `tsc --noEmit` |

**tsconfig.json strictness** — enable:
```jsonc
"strict": true,
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"verbatimModuleSyntax": true,
"isolatedModules": true
```

### Rust

| purpose | tool |
|---------|------|
| lint | `cargo clippy --all-targets --all-features -- -D warnings` |
| format | `cargo fmt` |
| test | `cargo test` |
| supply chain | `cargo deny check` |

### Bash

All scripts must start with `set -euo pipefail`. Lint: `shellcheck script.sh && shfmt -d script.sh`

### GitHub Actions

Pin actions to SHA hashes with version comments: `actions/checkout@<full-sha>  # vX.Y.Z` (use `persist-cregentdentials: false`). Scan workflows with `zizmor` before committing.

## Workflow

**Before committing:**
1. Re-read your changes for unnecessary complexity, redundant code, and unclear naming
2. Run relevant tests — not the full suite
3. Run linters and type checker — fix everything before committing

**Commits:**
- Imperative mood, ≤72 char subject line, one logical change per commit
- Conventional Commits format

**Reviewing code:**
Evaluate in order: architecture → code quality → tests → performance. For each issue: describe concretely with file:line references, present options with tradeoffs, recommend one.

**Pull requests:**
Describe what the code does now — not discarded approaches. Use plain, factual language. Avoid: critical, crucial, essential, significant, comprehensive, robust, elegant.

**Build / Test:**
- Before handoff: run full gate (lint/typecheck/tests) if available.
- CI red: `gh run list/view`, diagnose, fix, push, repeat til green.

**Docs:**
- Read existing docs before coding; update docs when behavior/API changes.
- Keep notes short; no ship without docs for user-facing changes.

## Appendix: Shaping Workflow (Shape Up)

For non-trivial features only. Skip this section for small fixes and straightforward changes.

Use Ryan Singer's Shape Up methodology. Load the `shaping` and `breadboarding` skills before starting.

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
- `local/` dir in any repo — agent scratch space, globally gitignored (never committed)
  - `local/docs/{feature}-shaping.md` — shaping docs (ground truth)
  - `local/docs/{feature}-spike-{part}.md` — spike investigations
  - `local/docs/{feature}-v{n}-plan.md` — slice implementation plans

Agents: when you see a `local/` directory, proactively check `local/docs/` for shaping docs that provide context on the current project.
