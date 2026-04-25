# grill-me

Adapted from Matt Pocock's Grill Me skill.

- Upstream: https://github.com/mattpocock/skills/tree/main/grill-me
- License: MIT
- Local purpose: make the skill available through dotfiles-managed agent skill directories

## Files

- `SKILL.md`

## Update workflow

From `~/dotfiles` or any shell:

```bash
mkdir -p ~/dotfiles/skills/grill-me
curl -fsSL "https://raw.githubusercontent.com/mattpocock/skills/main/grill-me/SKILL.md" \
  -o "$HOME/dotfiles/skills/grill-me/SKILL.md"
```

After updating, review the diff and verify the skill still loads correctly in Pi/Claude.
