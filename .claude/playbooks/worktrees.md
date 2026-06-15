# Workspace Isolation — Worktrees

Use a dedicated git worktree for any independent agent session or parallel piece of work in
this repo. **Never edit files directly in the shared checkout root when another session might
be active** — a `git checkout`/`git switch` in the shared root can silently overwrite
in-progress edits. Worktrees give each session a physically distinct directory, so collisions
become impossible by construction rather than by convention.

For a solo, single-session change you can work on a normal branch in the main checkout. Reach
for a worktree when you are: running multiple agents at once, spiking something while a real PR
is in flight, or letting an automated session touch files while you also have the repo open.

## Provisioning a worktree

```bash
cd "$(git rev-parse --show-toplevel)"          # repo root, not a worktree
git fetch origin main || (sleep 2 && git fetch origin main)
TASK=<issue-number>                             # MUST match [A-Za-z0-9_-]+
git worktree add -b claude/$TASK .claude/worktrees/$TASK origin/main
cd .claude/worktrees/$TASK
```

`$TASK` makes both the branch (`claude/$TASK`) and the path (`.claude/worktrees/$TASK`) unique,
so two sessions on different issues never collide. For exploratory work without a target issue,
use a memorable slug: `TASK=spike-flip-perf-01`.

Inside the worktree, all the usual commands run from `client/`:

```bash
cd client && npm install   # each worktree has its own node_modules
npm run dev                 # dev server on :5173 (stop other servers first to avoid port clash)
```

> Note: branch names here are `claude/<task>` for isolated agent work. PR branches still follow
> the repo convention `feature/issue-N-desc` / `fix/issue-N-desc` (see `sdlc.md`) — rename or
> open the PR from the appropriate branch when the work is ready.

## Cleanup

After your final push (or after the PR merges), run from the **repo root** (not from inside the
worktree — `git worktree remove` rejects the current directory):

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"
git worktree remove --force .claude/worktrees/$TASK
```

Leave the remote branch until the PR is closed — local cleanup is independent of remote-branch
life. `git worktree prune` clears any stale administrative entries.

## Why not just lock the file?

Tool calls don't hold filesystem locks across the agent loop, and `git` doesn't lock a worktree
against an external `checkout`. Distinct directories are the only reliable isolation.

## Relation to the claim protocol

The global claim skills (`/claim`, `/release`) are the **logical** lock on an issue; a worktree
is the **physical** lock on a path + branch. They're complementary. The worktree habit applies
even for scratch work where no claim is needed.
