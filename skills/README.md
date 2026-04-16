# Skills

Reusable capabilities for AI coding agents. Each skill is a self-contained directory with a `SKILL.md` file containing instructions, guidelines, and examples.

## Available Skills

| Skill | Category | Purpose |
|-------|----------|---------|
| [baseline-ui](./baseline-ui/) | Design | Anti-AI-slop UI constraints for Tailwind/React |
| [modern-python](./modern-python/) | Development | Modern Python tooling (uv, ruff, ty) |
| [rams](./rams/) | Design | WCAG 2.1 accessibility + visual design review |
| [tdd](./tdd/) | Development | Test-driven development with a red-green-refactor loop |
| [web-interface-guidelines](./web-interface-guidelines/) | Design | Comprehensive web UI compliance (80+ rules) |

## Installation

Skills are automatically available when symlinked into each agent's skills directory:

```bash
# Pi (~/.pi/agent/skills/)
ln -s ~/dotfiles/skills/baseline-ui ~/.pi/agent/skills/baseline-ui
ln -s ~/dotfiles/skills/modern-python ~/.pi/agent/skills/modern-python
ln -s ~/dotfiles/skills/rams ~/.pi/agent/skills/rams
ln -s ~/dotfiles/skills/tdd ~/.pi/agent/skills/tdd
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.pi/agent/skills/web-interface-guidelines

# Claude Code (~/.claude/skills/)
ln -s ~/dotfiles/skills/baseline-ui ~/.claude/skills/baseline-ui
ln -s ~/dotfiles/skills/modern-python ~/.claude/skills/modern-python
ln -s ~/dotfiles/skills/rams ~/.claude/skills/rams
ln -s ~/dotfiles/skills/tdd ~/.claude/skills/tdd
ln -s ~/dotfiles/skills/web-interface-guidelines ~/.claude/skills/web-interface-guidelines

# Amp (~/.config/amp/skills/)
ln -s ~/dotfiles/skills/baseline-ui ~/.config/amp/skills/baseline-ui
ln -s ~/dotfiles/skills/modern-python ~/.config/amp/skills/modern-python
ln -s ~/dotfiles/skills/rams ~/.config/amp/skills/rams
ln -s ~/dotfiles/skills/tdd ~/.config/amp/skills/tdd
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
/skill:baseline-ui
```

### Claude Code

```bash
/skill <skill-name> [arguments]
```

Examples:
```bash
/skill baseline-ui              # Apply constraints to current conversation
/skill rams src/Button.tsx      # Review specific file
/skill modern-python            # Get Python tooling guidance
/skill tdd                      # Use red-green-refactor for the task
```

### Amp

```bash
@<skill-name> [arguments]
```

Examples:
```bash
@baseline-ui
@rams src/Button.tsx
@modern-python
@tdd
```

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
| modern-python | Based on [trailofbits/cookiecutter-python](https://github.com/trailofbits/cookiecutter-python) | Apache-2.0 |
| rams | [rams.ai](https://rams.ai) | MIT |
| tdd | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/tdd) | MIT |
| web-interface-guidelines | [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | MIT |

## Vendored Third-Party Skills

Some skills are copied into this repo instead of referenced remotely at runtime.

Why:
- keeps `~/dotfiles` as the source of truth
- makes agent setup reproducible across machines
- lets us version upstream skill updates in git

Current vendored skills:
- `tdd` → synced from `mattpocock/skills/tree/main/tdd`

When updating a vendored skill:
1. Pull the latest upstream files into `skills/<name>/`
2. Review the diff locally
3. Keep attribution + license info in this README accurate
4. Recreate or verify any symlinks in agent-specific skill directories if needed
