# 0001. Local Kanban board and project memory for development

- Status: Accepted
- Date: 2026-10-16

## Context

Cykla is developed largely in Claude Code sessions. Each session starts without memory,
and the maintainer needs to see what is planned, in progress and finished. The maintainer's
other projects use the same workflow from a shared project template, so it is maintained and
tested in one place.

## Decision

- Development tasks live on a local board managed by the
  [claude-kanban](https://github.com/CjS77/claude-kanban) plugin: `.kanban/board.json` and
  `.kanban/config.json`, committed with the code. Columns are To do, Doing, Review and Done.
  The plugin is installed per user, never through the project settings.
- Work lands through pull requests. Auto-merge and auto-review stay off; `/kanban:work` loops
  run only when the maintainer starts one. A ticket moves to Done when its branch reaches
  local `master`.
- `docs/PROJECT_STATE.md`, `docs/ARCHITECTURE.md` and these records hold the narrative
  memory. A `SessionStart` hook (`.claude/hooks/session-context.mjs`) injects git state, the
  board and the project state into every session, including after compaction.
- `.kanban/board.json` merges through an ID-based git merge driver
  (`scripts/workflow/kanban-merge-driver.mjs`), enabled once per clone with `git config`.
- GitHub issues and pull requests stay the place for maintenance (Dependabot) and outside
  contributions.
- The board and documents never contain real health data.

## Alternatives considered

- A GitHub Project board: needs network calls in every session and tends to track pull
  requests rather than planned work.
- Notes only in Markdown: no live task state, and nothing for the maintainer to reorder.

## Consequences

- The board is readable without network access and reviewable in diffs.
- Board changes ride along with the branch checked out in the main working tree; the merge
  driver combines parallel edits by ticket ID. GitHub's web merge does not run it, so a pull
  request with a `board.json` conflict is rebased locally.
- External contributors need neither Claude Code nor the plugin; nothing in the build or
  tests depends on them.
- The plugin has a single maintainer. Upgrades are deliberate; if it is abandoned, the JSON
  and the documents remain usable.
