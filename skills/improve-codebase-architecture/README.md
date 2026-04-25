# improve-codebase-architecture

Vendored copy of Matt Pocock's Improve Codebase Architecture skill.

- Upstream: https://github.com/mattpocock/skills/tree/main/improve-codebase-architecture
- License: MIT
- Local purpose: make the skill available through dotfiles-managed agent skill directories

## Files

This directory mirrors the upstream skill structure, with two local adaptations:

- domain-model reference docs are vendored locally so relative links work when this skill is installed standalone
- Claude-specific Agent tool wording is broadened so the skill works in Pi via `subagent`


- `SKILL.md`
- `LANGUAGE.md`
- `DEEPENING.md`
- `INTERFACE-DESIGN.md`
- `references/domain-model/CONTEXT-FORMAT.md`
- `references/domain-model/ADR-FORMAT.md`

## Update workflow

From `~/dotfiles` or any shell:

```bash
skill_dir="$HOME/dotfiles/skills/improve-codebase-architecture"
mkdir -p "$skill_dir/references/domain-model"
for f in SKILL.md LANGUAGE.md DEEPENING.md INTERFACE-DESIGN.md; do
  curl -fsSL "https://raw.githubusercontent.com/mattpocock/skills/main/improve-codebase-architecture/$f" \
    -o "$skill_dir/$f"
done
curl -fsSL "https://raw.githubusercontent.com/mattpocock/skills/main/domain-model/CONTEXT-FORMAT.md" \
  -o "$skill_dir/references/domain-model/CONTEXT-FORMAT.md"
curl -fsSL "https://raw.githubusercontent.com/mattpocock/skills/main/domain-model/ADR-FORMAT.md" \
  -o "$skill_dir/references/domain-model/ADR-FORMAT.md"
python3 - <<'PY'
from pathlib import Path
p = Path.home() / 'dotfiles/skills/improve-codebase-architecture/SKILL.md'
s = p.read_text()
s = s.replace('../domain-model/CONTEXT-FORMAT.md', 'references/domain-model/CONTEXT-FORMAT.md')
s = s.replace('../domain-model/ADR-FORMAT.md', 'references/domain-model/ADR-FORMAT.md')
s = s.replace(
    'Then use the Agent tool with `subagent_type=Explore` to walk the codebase.',
    'Then use the available codebase exploration/delegation tool to walk the codebase (Claude Code: Agent tool with `subagent_type=Explore`; Pi: `subagent` with `scout` or `worker`).',
)
p.write_text(s)

p = Path.home() / 'dotfiles/skills/improve-codebase-architecture/INTERFACE-DESIGN.md'
s = p.read_text()
s = s.replace(
    'Spawn 3+ sub-agents in parallel using the Agent tool.',
    'Spawn 3+ sub-agents in parallel using the available delegation tool (Claude Code: Agent tool; Pi: `subagent`).',
)
p.write_text(s)
PY
```

After updating, review the diff and verify the skill still loads correctly in Pi/Claude.
