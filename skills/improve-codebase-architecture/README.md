# improve-codebase-architecture

Vendored copy of Matt Pocock's Improve Codebase Architecture skill.

- Upstream: https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture
- License: MIT
- Local purpose: make the skill available through dotfiles-managed agent skill directories

## Local adaptations

This directory mirrors the upstream skill with small Pi/dotfiles adaptations:

- domain-model reference docs are vendored locally so relative links work when this skill is installed standalone
- Claude-specific Agent tool wording is broadened so the skill works in Pi via `subagent`
- HTML report guidance is retained from Matt Pocock's 2026 update, observed in Dillon Mulroy's dotfiles commit `55dbc9172e47f0c30d3c2cc1dd31dbf25bdac4c5`

## Files

- `SKILL.md`
- `LANGUAGE.md`
- `DEEPENING.md`
- `INTERFACE-DESIGN.md`
- `HTML-REPORT.md`
- `references/domain-model/CONTEXT-FORMAT.md`
- `references/domain-model/ADR-FORMAT.md`

## Update workflow

Matt's repo supports the public Skills installer:

```bash
npx skills@latest add mattpocock/skills
```

Dillon Mulroy's dotfiles also include a `sync-pocock-skills` skill with scripts that clone `mattpocock/skills`, compare local copies, and re-apply Pi-specific patches. So his sync likely is not fully manual, even though the referenced commit only shows the resulting file changes.

For this dotfiles repo, keep vendoring explicit so changes are reviewable in git:

```bash
skill_dir="$HOME/dotfiles/skills/improve-codebase-architecture"
base_url="https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/improve-codebase-architecture"
context_url="https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/grill-with-docs"

mkdir -p "$skill_dir/references/domain-model"
for f in SKILL.md LANGUAGE.md DEEPENING.md INTERFACE-DESIGN.md HTML-REPORT.md; do
  curl -fsSL "$base_url/$f" -o "$skill_dir/$f"
done
curl -fsSL "$context_url/CONTEXT-FORMAT.md" \
  -o "$skill_dir/references/domain-model/CONTEXT-FORMAT.md"
curl -fsSL "$context_url/ADR-FORMAT.md" \
  -o "$skill_dir/references/domain-model/ADR-FORMAT.md"

python3 - <<'PY'
from pathlib import Path

skill_dir = Path.home() / "dotfiles/skills/improve-codebase-architecture"

p = skill_dir / "SKILL.md"
s = p.read_text()
s = s.replace("../grill-with-docs/CONTEXT-FORMAT.md", "references/domain-model/CONTEXT-FORMAT.md")
s = s.replace("../grill-with-docs/ADR-FORMAT.md", "references/domain-model/ADR-FORMAT.md")
s = s.replace(
    "Then use the Agent tool with `subagent_type=Explore` to walk the codebase.",
    "Then use the available codebase exploration/delegation tool to walk the codebase (Claude Code: Agent tool with `subagent_type=Explore`; Pi: `subagent` with `scout` or `worker`).",
)
p.write_text(s)

p = skill_dir / "INTERFACE-DESIGN.md"
s = p.read_text()
s = s.replace(
    "Spawn 3+ sub-agents in parallel using the Agent tool.",
    "Spawn 3+ sub-agents in parallel using the available delegation tool (Claude Code: Agent tool; Pi: `subagent`).",
)
p.write_text(s)
PY
```

After updating, review the diff and verify the skill still loads correctly in Pi/Claude.
