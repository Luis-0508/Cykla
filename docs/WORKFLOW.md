# Development workflow

How this repository keeps its project knowledge current, and how Claude Code
and GitHub issues fit in. `AGENTS.md` holds the rules every
contributor follows; this document explains the moving parts behind them.

## Layers

| Layer                | Files                                                                          | Needed by               |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| Rules                | `AGENTS.md`                                                                    | Everyone                |
| Project memory       | `docs/PROJECT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS/`             | Everyone                |
| Claude Code workflow | `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/`, `.claude/skills/`      | Claude Code users       |
| Workflow tooling     | `.gitattributes`, `scripts/workflow/`, `.github/workflows/workflow-checks.yml` | Maintainers; runs in CI |

External contributors work from `AGENTS.md`, `CONTRIBUTING.md` and the
issues alone. Nothing in the build or tests depends on Claude Code.

## This repository's setup

The project memory and the session hook are already initialized here; the
`init-project` skill only matters again if `docs/PROJECT_STATE.md` goes missing.
The workflow follows the maintainer's shared project template (a private
repository); when the template's workflow files change, port the change
deliberately rather than copying over project-specific content. Planned work is
tracked in GitHub issues and milestones (decision 0002). Issues migrated from
the former Kanban board start with "Migrated from Kanban ticket K-n", so K-n IDs
in older commits and documents stay traceable.

Cykla specifics: the default branch is `master`. `docs/ROADMAP.md` (mirrored
in-app by `src/config/roadmap.ts`) keeps the version plan; GitHub issues in the
milestone "0.2 Hardening" hold the work of the version in progress. Later
versions become issues when they are planned in detail.

Without Claude Code, read and edit the `docs/` files by hand.

## What happens automatically and what needs approval

| Automatic                                                                                                        | Needs your go-ahead                                      | Never without an explicit request                          |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Session-start hook: reads git state, open pull requests, your assigned issues and `PROJECT_STATE.md` (read-only) | Initializing the project (`init-project`)                | Merging a pull request, enabling auto-merge, force-pushing |
| Claude updates `PROJECT_STATE.md`, `ARCHITECTURE.md` and decision records as part of the work it was asked to do | Creating or closing issues, changing milestones          | Autonomous work loops                                      |
| Claude assigns, comments on and links the issue it was asked to work on                                          | Changing the priority order you set                      | Deploying, publishing, delegating to external workers      |
| GitHub closes an issue when the pull request that says `Closes #N` is merged                                     | Installing plugins (Claude only reports what is missing) | Closing an issue as done without a merged pull request     |

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
which prints branch and sync state, uncommitted files, recent commits, up to
five open pull requests and issues assigned to you (two `gh` calls with a
four-second timeout each, skipped silently when `gh` is missing, signed out or
offline; `SESSION_CONTEXT_OFFLINE=1` skips them on purpose) and the content of
`PROJECT_STATE.md`. Because it also runs after compaction, a long session
recovers the same context without re-reading files. `CLAUDE.md` itself is
re-loaded by Claude Code after compaction.

The hook needs Node.js on `PATH`. Without it, the hook fails without blocking
the session, and `CLAUDE.md` tells Claude to read `PROJECT_STATE.md` instead.

## Checks

```bash
node --test "scripts/workflow/*.test.mjs"
```

The tests cover the session-start hook against temporary repositories and
the consistency of the Claude Code configuration (`CLAUDE.md` imports
`AGENTS.md` exactly once, hook and skill files exist and are well formed, no
personal paths, no Kanban leftovers). `.github/workflows/workflow-checks.yml` runs them on Linux and
Windows whenever these files change.
