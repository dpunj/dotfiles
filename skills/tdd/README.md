# tdd

Vendored copy of Matt Pocock's TDD skill.

- Upstream: https://github.com/mattpocock/skills/tree/main/tdd
- License: MIT
- Local purpose: make the skill available through dotfiles-managed agent skill directories

## Files

This directory intentionally mirrors the upstream skill structure:

- `SKILL.md`
- `deep-modules.md`
- `interface-design.md`
- `mocking.md`
- `refactoring.md`
- `tests.md`

## Update workflow

From `~/dotfiles` or any shell:

```bash
mkdir -p ~/dotfiles/skills/tdd
for f in SKILL.md deep-modules.md interface-design.md mocking.md refactoring.md tests.md; do
  curl -fsSL "https://raw.githubusercontent.com/mattpocock/skills/main/tdd/$f" \
    -o "$HOME/dotfiles/skills/tdd/$f"
done
```

After updating, review the diff and verify the skill still loads correctly in Pi/Claude.
