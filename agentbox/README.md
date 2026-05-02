# Agentbox

Personal always-on coding box for agent work on `~/code/versa-ts`.

The goal is boring on purpose: one reachable machine, warm repo context, isolated
worktrees per agent, and a clean path back to GitHub. Tailscale provides the
network boundary; git worktrees provide the collaboration boundary.

## Shape

```text
devbox
├── ~/code/versa-ts/                  # canonical shared clone
├── ~/code/worktrees/
│   ├── versa-ts-agent-fix-hours/     # one task/session
│   └── versa-ts-agent-pr-review/     # another task/session
└── ~/.local/bin/
    ├── agentbox-doctor
    └── agent-worktree
```

Use the canonical clone for fetches, branch inspection, and dependency warming.
Use worktrees for all agent edits.

## First Setup

1. Install Tailscale on the box and your client devices.
2. Enable Tailscale SSH for the box.
3. Clone dotfiles and run `bootstrap.fish`.
4. Authenticate GitHub with `gh auth login`.
5. Clone `versa-ts` into `~/code/versa-ts`.
6. Run `agentbox-doctor`.

The box should not expose SSH to the public internet. Access should be through
Tailscale only.

## Tailscale SSH

On the devbox:

```fish
sudo tailscale up --hostname agentbox
sudo tailscale set --ssh
```

Then connect from another tailnet device:

```fish
ssh agentbox
```

If the tailnet has custom access controls, add an SSH rule that lets your user
connect to this machine as a non-root account. Prefer Tailscale check mode for
admin-style access.

## Daily Flow

Create a task workspace:

```fish
agent-worktree fix-felipe-hours
```

Then start a persistent session:

```fish
cd ~/code/worktrees/versa-ts-agent-fix-felipe-hours
tmux new -A -s versa-fix-felipe-hours
```

Inside the session, run the agent CLI you want. The worktree is a normal checkout,
so review, test, commit, and push work exactly like local development.

## Safety Defaults

- Keep prod credentials out of the default shell.
- Prefer dev/test database access for background sessions.
- Use explicit human approval for deploys and prod writes.
- Keep each agent in one worktree.
- Delete merged/stale worktrees with `git worktree remove`, not by deleting dirs.

## Useful Commands

```fish
agentbox-doctor
agent-worktree fix-payment-copy
agent-worktree fix-payment-copy versa-ts main
git -C ~/code/versa-ts worktree list
```

## Next Slices

- Add an optional systemd timer for `git fetch` and dependency warming.
- Add a `tmux` starter that opens the worktree and launches the preferred agent.
- Add repo-specific health checks once the devbox target is chosen.
