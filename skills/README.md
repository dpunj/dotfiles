# Skills

Reusable capabilities for AI coding agents. Each skill is a self-contained directory with a `SKILL.md` file containing instructions, guidelines, and examples.

## Available Skills

| Skill | Category | Purpose |
|-------|----------|---------|
| [baseline-ui](./baseline-ui/) | Design | Anti-AI-slop UI constraints for Tailwind/React |
| [breadboarding](./breadboarding/) | Planning | Turn a workflow description into affordance tables mapping UI and code wiring |
| [explain-diff-html](./explain-diff-html/) | Learning | Turn a diff, branch, or PR into a self-contained interactive HTML explainer with a comprehension quiz |
| [grill-me](./grill-me/) | Planning | Relentless interview loop for stress-testing plans and uncovering hidden requirements |
| [improve-codebase-architecture](./improve-codebase-architecture/) | Architecture | Find deepening opportunities, refactoring seams, and testability improvements |
| [last30days](./last30days/) | Research | Search recent social/web sources and synthesize what people are saying now |
| [modern-python](./modern-python/) | Development | Modern Python tooling (uv, ruff, ty) |
| [rams](./rams/) | Design | WCAG 2.1 accessibility + visual design review |
| [shaping](./shaping/) | Planning | Shape Up methodology — iterate on requirements and solution shapes with fit checks before building |
| [tdd](./tdd/) | Development | Test-driven development with a red-green-refactor loop |
| [teach](./teach/) | Productivity | Stateful teaching workspace for learning a new skill or concept |
| [web-interface-guidelines](./web-interface-guidelines/) | Design | Comprehensive web UI compliance (80+ rules) |

## Installation

Skills are automatically available when symlinked into each agent's skills directory:

```bash
# Pi (~/.pi/agent/skills/)
ln -s ~/dotfiles/skills/baseline-ui ~/.pi/agent/skills/baseline-ui
ln -s ~/dotfiles/skills/grill-me ~/.pi/agent/skills/grill-me
ln -s ~/dotfiles/skills/improve-codebase-architecture ~/.pi/agent/skills/improve-codebase-architecture
ln -s ~/dotfiles/skills/last30days ~/.pi/agent/skills/last30days
ln -s ~/dotfiles/skills/modern-python ~/.pi/agent/skills/modern-python
ln -s ~/dotfiles/skills/rams ~/.pi/agent/skills/rams
ln -s ~/dotfiles/skills/tdd ~/.pi/agent/skills/tdd
ln -s ~/dotfiles/skills/teach ~/.pi/agent/skills/teach
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.pi/agent/skills/web-interface-guidelines

# Claude Code (~/.claude/skills/)
ln -s ~/dotfiles/skills/baseline-ui ~/.claude/skills/baseline-ui
ln -s ~/dotfiles/skills/grill-me ~/.claude/skills/grill-me
ln -s ~/dotfiles/skills/improve-codebase-architecture ~/.claude/skills/improve-codebase-architecture
ln -s ~/dotfiles/skills/last30days ~/.claude/skills/last30days
ln -s ~/dotfiles/skills/modern-python ~/.claude/skills/modern-python
ln -s ~/dotfiles/skills/rams ~/.claude/skills/rams
ln -s ~/dotfiles/skills/tdd ~/.claude/skills/tdd
ln -s ~/dotfiles/skills/teach ~/.claude/skills/teach
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.claude/skills/web-interface-guidelines

# Codex (~/.codex/skills/)
ln -s ~/dotfiles/codex/skills/baseline-ui ~/.codex/skills/baseline-ui
ln -s ~/dotfiles/codex/skills/grill-me ~/.codex/skills/grill-me
ln -s ~/dotfiles/codex/skills/improve-codebase-architecture ~/.codex/skills/improve-codebase-architecture
ln -s ~/dotfiles/codex/skills/last30days ~/.codex/skills/last30days
ln -s ~/dotfiles/codex/skills/modern-python ~/.codex/skills/modern-python
ln -s ~/dotfiles/codex/skills/rams ~/.codex/skills/rams
ln -s ~/dotfiles/codex/skills/tdd ~/.codex/skills/tdd
ln -s ~/dotfiles/codex/skills/tmux ~/.codex/skills/tmux
ln -s ~/dotfiles/codex/skills/teach ~/.codex/skills/teach
ln -s ~/dotfiles/codex/skills/web-interface-guidelines ~/.codex/skills/web-interface-guidelines

# Amp (~/.config/amp/skills/)
ln -s ~/dotfiles/skills/baseline-ui ~/.config/amp/skills/baseline-ui
ln -s ~/dotfiles/skills/grill-me ~/.config/amp/skills/grill-me
ln -s ~/dotfiles/skills/improve-codebase-architecture ~/.config/amp/skills/improve-codebase-architecture
ln -s ~/dotfiles/skills/last30days ~/.config/amp/skills/last30days
ln -s ~/dotfiles/skills/modern-python ~/.config/amp/skills/modern-python
ln -s ~/dotfiles/skills/rams ~/.config/amp/skills/rams
ln -s ~/dotfiles/skills/tdd ~/.config/amp/skills/tdd
ln -s ~/dotfiles/skills/teach ~/.config/amp/skills/teach
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.config/amp/skills/web-interface-guidelines
```

## Usage

### Pi

```bash
/skill:<skill-name> [arguments]
```

Examples:
```bash
/skill:tdd
/skill:tdd implement order cancellation flow
/skill:grill-me stress-test this merchant onboarding plan
/skill:improve-codebase-architecture find deepening opportunities in src/tools
/skill:last30days OpenClaw vs Hermes
/skill:baseline-ui
/skill:teach TypeScript generics
```

### Claude Code

```bash
/skill <skill-name> [arguments]
```

Examples:
```bash
/skill baseline-ui              # Apply constraints to current conversation
/skill grill-me                 # Stress-test a plan through structured questions
/skill improve-codebase-architecture  # Find architecture deepening opportunities
/skill last30days AI video tools  # Recent social/web research brief
/skill rams src/Button.tsx      # Review specific file
/skill modern-python            # Get Python tooling guidance
/skill tdd                      # Use red-green-refactor for the task
/skill teach Rust lifetimes      # Start a teaching workspace
```

### Amp

```bash
@<skill-name> [arguments]
```

Examples:
```bash
@baseline-ui
@grill-me stress-test this architecture
@improve-codebase-architecture src/
@last30days AI video tools
@rams src/Button.tsx
@modern-python
@tdd
@teach database indexing
```

### Codex

Codex discovers global user skills from `~/.codex/skills/`. Link shared
dotfiles skills through `~/dotfiles/codex/skills/`.

Codex discovers repo-scoped skills from `.agents/skills` under the current
working tree. The notes vault keeps vault-owned Obsidian skills local to that
project:

```bash
mkdir -p ~/notes/.agents/skills
ln -s ../../.amp/skills/defuddle ~/notes/.agents/skills/defuddle
ln -s ../../.amp/skills/obsidian-markdown ~/notes/.agents/skills/obsidian-markdown
ln -s ../../.amp/skills/obsidian-bases ~/notes/.agents/skills/obsidian-bases
ln -s ../../.amp/skills/obsidian-cli ~/notes/.agents/skills/obsidian-cli
ln -s ../../.amp/skills/json-canvas ~/notes/.agents/skills/json-canvas
```

Restart Codex if skill changes do not appear automatically.

## When to Use Each Skill

### baseline-ui

**Use at the start of UI work.** Apply these constraints before generating any code to prevent common AI slop issues.

Key constraints:
- Tailwind CSS defaults (no arbitrary values)
- `motion/react` for JS animations
- Accessible primitives (Base UI, Radix)
- No `h-screen`, use `h-dvh`
- Animate only `transform`/`opacity`
- `text-balance` for headings, `text-pretty` for body

### explain-diff-html

**Use when you need to explain a code change to someone (including future you).** Point it at a diff, branch, or PR and it produces a single self-contained HTML file — Background, Intuition, high-level Code walkthrough, and an interactive multiple-choice quiz to check comprehension.

Good for:
- Onboarding a teammate onto an unfamiliar PR or branch
- Capturing the "why" behind a non-trivial change as a shareable artifact
- Self-checking that you actually understand a change you're reviewing

Output lands outside the repo with a `YYYY-MM-DD-` filename prefix, so explainers stay time-sorted and out of version control.

### grill-me

**Use before building or committing to a plan.** The agent interviews you one decision at a time, explores the codebase when it can answer its own questions, and provides its recommended answer for each unresolved branch.

Good for:
- Stress-testing feature plans and architecture proposals
- Discovering hidden requirements before implementation
- Turning vague ideas into executable scope
- Rubber-ducking tradeoffs with an opinionated partner

### improve-codebase-architecture

**Use when architecture feels too shallow, coupled, or hard to test.** The agent reads context docs and ADRs, explores the codebase, and surfaces numbered deepening opportunities before proposing interfaces.

Good for:
- Finding shallow pass-through modules
- Consolidating tightly coupled modules behind deeper interfaces
- Improving locality and leverage
- Making code easier to test through real seams
- Avoiding architecture drift by respecting existing ADRs

### last30days

**Use when you need current signal from the last month.** Searches Reddit, Hacker News, Polymarket, GitHub, and other configured sources, then produces a cited research brief.

Optional unlocks:
- `yt-dlp` for YouTube
- browser cookies or X credentials for X/Twitter
- API keys for ScrapeCreators, OpenRouter, Brave, Bluesky, and related sources

### modern-python

**Use when working with Python.** Covers project setup, dependency management, and tooling configuration.

Key topics:
- `uv` for package/venv management
- `ruff` for linting and formatting
- `ty` for type checking
- PEP 723 for standalone scripts
- Migration from pip/poetry/mypy/black

### rams

**Use for reviewing existing UI code.** Provides scored accessibility and visual design review.

Checks for:
- WCAG 2.1 violations (images without alt, missing labels, etc.)
- Visual design issues (spacing, typography, contrast)
- Missing component states (hover, focus, disabled)

Output: Score out of 100 + actionable fixes with line numbers.

### tdd

**Use when building features or fixing bugs test-first.** Guides the agent through a strict red-green-refactor loop using one vertical slice at a time.

Key ideas:
- Test behavior through public interfaces
- Avoid horizontal slicing (`write all tests, then all code`)
- Prefer integration-style tests over implementation-coupled mocks
- Ask for interface + behavior agreement before starting
- Refactor only after returning to green

### teach

**Use when learning a new skill or concept over multiple sessions.** The agent treats the current directory as a teaching workspace with mission, resources, lessons, reference docs, and learning records.

Good for:
- Building a stateful curriculum around a specific goal
- Producing short, cited HTML lessons
- Tracking learning records and reference material over time

### web-interface-guidelines

**Use for comprehensive UI compliance review.** The complete rulebook covering edge cases.

Rules cover:
- Accessibility (focus states, ARIA, semantic HTML)
- Forms (autocomplete, validation, error handling)
- Animation (reduced motion, compositor-friendly)
- Typography (ellipsis, quotes, tabular nums)
- Performance (virtualization, DOM batching)
- i18n (Intl.* APIs)
- Hydration safety

## Combining Skills

Skills can be used together for comprehensive workflows:

**Starting a new React + TypeScript project:**
```bash
/skill baseline-ui     # Apply UI constraints first
# ... build components ...
/skill rams src/       # Review for a11y/design issues
```

**Starting a new Python project:**
```bash
/skill modern-python   # Get tooling guidance
# ... follow the skill's project setup instructions ...
```

**Building a feature test-first:**
```bash
/skill tdd             # Lock into red-green-refactor
# agree on the public interface + first behavior
# implement one tracer bullet at a time
```

**Polishing a web app:**
```bash
/skill web-interface-guidelines src/  # Full compliance check
/skill rams src/                      # Focused a11y review with scores
```

## Adding New Skills

1. Create a new directory: `skills/<skill-name>/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: skill-name
   description: Brief description of what this skill does
   ---
   ```
3. Write clear instructions, examples, and guidelines
4. Symlink to agent skill directories
5. Update this README

## Skill Sources

| Skill | Upstream | License |
|-------|----------|---------|
| baseline-ui | [ibelick/ui-skills](https://github.com/ibelick/ui-skills) | MIT |
| breadboarding | [rjs/shaping-skills](https://github.com/rjs/shaping-skills) | No explicit license (see upstream) |
| explain-diff-html | [geoffreylitt gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524) | No explicit license (see upstream gist) |
| grill-me | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) | MIT |
| improve-codebase-architecture | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture) | MIT |
| last30days | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | MIT |
| modern-python | Based on [trailofbits/cookiecutter-python](https://github.com/trailofbits/cookiecutter-python) | Apache-2.0 |
| rams | [rams.ai](https://rams.ai) | MIT |
| shaping | [rjs/shaping-skills](https://github.com/rjs/shaping-skills) | No explicit license (see upstream) |
| tdd | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) | MIT |
| teach | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach) | MIT |
| web-interface-guidelines | [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | MIT |

## Vendored Third-Party Skills

Some skills are copied into this repo instead of referenced remotely at runtime.

Why:
- keeps `~/dotfiles` as the source of truth
- makes agent setup reproducible across machines
- lets us version upstream skill updates in git

Current vendored skills:
- `breadboarding` → synced from `rjs/shaping-skills` at commit `d8b65d7`; upstream file `breadboarding/skill.md` vendored here as `SKILL.md` (case-normalized for skill loaders)
- `explain-diff-html` → vendored from Geoffrey Litt's [gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524); single self-contained `SKILL.md`, kept verbatim
- `grill-me` → adapted from `mattpocock/skills/tree/main/skills/productivity/grill-me`
- `improve-codebase-architecture` → synced from `mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture` with supporting domain-model references vendored locally; latest HTML-report update traced through Dillon Mulroy's dotfiles commit `55dbc9172e47f0c30d3c2cc1dd31dbf25bdac4c5`
- `last30days` → synced from `mvanhorn/last30days-skill` at commit `122158415ae4`; includes the upstream MIT license in the skill directory
- `shaping` → synced from `rjs/shaping-skills` at commit `d8b65d7`
- `tdd` → synced from `mattpocock/skills/tree/main/skills/engineering/tdd`
- `teach` → synced from `mattpocock/skills/tree/main/skills/productivity/teach`

Vault-owned skills are intentionally not vendored here:
- `defuddle`
- `obsidian-markdown`
- `obsidian-bases`
- `obsidian-cli`
- `json-canvas`

They live in `~/notes/.amp/skills/` and are exposed to Codex only inside the
notes project through `~/notes/.agents/skills/`.

When updating a vendored skill:
1. Prefer the upstream repo (`mattpocock/skills`) as the source of truth; use third-party dotfiles commits as pointers to interesting upstream changes
2. Pull the latest upstream files into `skills/<name>/`
3. Review the diff locally
4. Keep attribution + license info in this README accurate
5. Recreate or verify any symlinks in agent-specific skill directories if needed
