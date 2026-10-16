# Development workflow

How this repository keeps its project knowledge current, and how Claude Code
and the local Kanban board fit in. `AGENTS.md` holds the rules every
contributor follows; this document explains the moving parts behind them.

## Layers

| Layer                | Files                                                                          | Needed by                                             |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Rules                | `AGENTS.md`                                                                    | Everyone                                              |
| Project memory       | `docs/PROJECT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS/`             | Everyone                                              |
| Claude Code workflow | `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/`, `.claude/skills/`      | Claude Code users                                     |
| Task board           | `.kanban/` ([claude-kanban](https://github.com/CjS77/claude-kanban) plugin)    | Default for the maintainer; optional for contributors |
| Workflow tooling     | `.gitattributes`, `scripts/workflow/`, `.github/workflows/workflow-checks.yml` | Maintainers; runs in CI                               |

For the maintainer's Claude Code workflow, the board is a default component
like the project memory and the session hook: every initialized repository
has one. External contributors and environments without the plugin work from
`AGENTS.md` and `CONTRIBUTING.md` alone. Nothing in the build or tests depends
on Claude Code or the plugin.

## This repository's setup

The project memory, the Kanban board and the session hook are already
initialized here; the `init-project` skill only matters again if the board or
`docs/PROJECT_STATE.md` goes missing. The workflow follows the maintainer's
shared project template (a private repository); when the template's workflow
files change, port the change deliberately rather than copying over
project-specific content.

Cykla specifics: the default branch is `master`. `docs/ROADMAP.md` (mirrored
in-app by `src/config/roadmap.ts`) keeps the version plan; the board holds the
work of the version in progress (0.2 Hardening). Later versions move onto the
board when they are planned in detail.

Without Claude Code, read and edit the `docs/` files by hand. The board
is maintained by the maintainer with the plugin.

## Installing the Kanban plugin

The plugin is installed per user, never through the repository's settings, so
contributors are not asked to install it. In a terminal:

```bash
claude plugin marketplace add CjS77/claude-kanban
```

```bash
claude plugin install kanban@claude-kanban
```

Or inside Claude Code: `/plugin marketplace add CjS77/claude-kanban`, then
`/plugin install kanban@claude-kanban`. Restart Claude Code (or run
`/reload-plugins`) afterwards. The first start downloads the plugin's
prebuilt binary and verifies its checksum; only unsupported platforms need a
Rust toolchain.

To pin a release instead of following the default branch, declare the
marketplace with a `ref` in `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-kanban": {
      "source": {
        "source": "git",
        "url": "https://github.com/CjS77/claude-kanban.git",
        "ref": "v3.8.2"
      }
    }
  }
}
```

Upgrade deliberately: read the changelog, then move the `ref`.

## What happens automatically and what needs approval

| Automatic                                                                                                                                   | Needs your go-ahead                                                                                      | Never without an explicit request                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Session-start hook: reads git state, the board and `PROJECT_STATE.md` (read-only, local, no network)                                        | Initializing the project (`init-project`): memory, documentation, board and merge driver in one approval | Merging a pull request, enabling auto-merge, force-pushing |
| Claude updates `PROJECT_STATE.md`, `ARCHITECTURE.md` and decision records as part of the work it was asked to do                            | Installing plugins (Claude only reports what is missing)                                                 | `/kanban:work` loops, `auto_merge`, `auto_review`          |
| Claude creates, claims, notes and moves tickets for non-trivial work it was asked to do; new tickets wait in `review` status for you to vet | Changing ticket priority order you set                                                                   | Deploying, publishing, delegating to external workers      |
| The board moves a ticket to Done once its branch is merged into local `master`                                                              | Accepting or discarding a ticket in review                                                               | Moving a ticket to Done by hand                            |
| The board merge driver merges `board.json` by ID during `git merge` / `git rebase`                                                          | Resolving a merge the driver flags                                                                       | Resolving board conflicts by keeping one whole side        |

## Keeping the Markdown files current

| File                       | Updated when                                                                                                                                          | Size                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/PROJECT_STATE.md`    | A milestone lands, substantial work ends (including what is unfinished), blockers or priorities change. Update "Last updated" and "Verified against". | Under about 80 lines; it is injected into every Claude session. |
| `docs/ARCHITECTURE.md`     | Modules, boundaries or data flow change.                                                                                                              | As long as needed, read only when relevant.                     |
| `docs/DECISIONS/NNNN-*.md` | A choice between real alternatives is made. Accepted records are never rewritten; a new record supersedes them.                                       | One page.                                                       |
| `README.md`                | Setup, features or screenshots change.                                                                                                                | Short                                                           |

The repository always wins over these files. The session-start hook shows how
many commits have landed since `PROJECT_STATE.md` last changed, so a stale
snapshot is noticed and corrected instead of trusted.

## Session start and context recovery

`.claude/settings.json` registers one `SessionStart` hook for `startup`,
`resume`, `clear` and `compact`. It runs `node .claude/hooks/session-context.mjs`,
which prints branch and sync state, uncommitted files, recent commits, the
board's Doing / Review / top To do tickets and the content of
`PROJECT_STATE.md`. Because it also runs after compaction, a long session
recovers the same context without re-reading files. `CLAUDE.md` itself is
re-loaded by Claude Code after compaction.

The hook needs Node.js on `PATH`. Without it, the hook fails without blocking
the session, and `CLAUDE.md` tells Claude to read `PROJECT_STATE.md` instead.

## Kanban board merges

The plugin keeps one board per repository in the **main working tree's**
`.kanban/board.json`, also when a session works in another worktree. Board
changes are therefore written to whatever branch is checked out there, and
parallel branches each carry their own version of the file. A line-based
merge of that JSON either conflicts or, worse, is resolved by keeping one
side, which silently drops the other side's tickets and notes.

`scripts/workflow/kanban-merge-driver.mjs` merges the board by ticket and epic
ID instead:

- Tickets or epics added on either side are kept. If both sides created the
  same new ID, theirs is renumbered and the merge is flagged.
- Notes and review entries are combined chronologically; labels and
  dependencies are merged as sets.
- Different fields changed on each side are combined. The same field changed
  differently on both sides keeps ours and is flagged with both values.
- A ticket removed on one side is dropped only if the other side left it
  unchanged.
- `version` and the ID counters move past both sides.

When anything is flagged, the driver still writes a complete, valid board,
prints the reasons, and leaves the file marked as conflicted. Check the
listed tickets, adjust them on the board if needed, then `git add` the file.

Enable it once per clone (the `init-project` skill does this):

```bash
git config merge.kanban-board.name "Kanban board merge by ticket ID"
git config merge.kanban-board.driver "node scripts/workflow/kanban-merge-driver.mjs %O %A %B"
```

`.gitattributes` routes `.kanban/board.json` to the driver. Without the
configuration git falls back to its normal text merge, and the session-start
hook reminds you. GitHub's web merge does not run custom drivers: when a pull
request shows a conflict in `board.json`, rebase the branch locally instead.

Further rules:

- Commit board changes from the main working tree. A worktree's copy of
  `.kanban/board.json` is stale; do not commit it from there.
- Never resolve a board conflict with `git checkout --ours/--theirs` or by
  keeping the newer file.

## Checks

```bash
node --test "scripts/workflow/*.test.mjs"
```

The tests cover the merge driver (including real `git merge` and
`git rebase` runs), the session-start hook against temporary repositories, and
the consistency of the Claude Code configuration (`CLAUDE.md` imports
`AGENTS.md` exactly once, hook and skill files exist and are well formed, no
personal paths). `.github/workflows/workflow-checks.yml` runs them on Linux and
Windows whenever these files change.
