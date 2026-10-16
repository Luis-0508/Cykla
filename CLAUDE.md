@AGENTS.md

# Claude Code workflow for Cykla

`AGENTS.md` (imported above) holds the project rules and wins over anything
here. This file only adds how Claude Code sessions keep continuity, track work
and use installed tools. Personal preferences (conversation language, model
delegation) belong in the user's global `~/.claude/CLAUDE.md`, not here.

## Sources of truth

| What                                  | Where                                       | Authority              |
| ------------------------------------- | ------------------------------------------- | ---------------------- |
| Code, history, branches, PRs          | git and GitHub                              | Highest. Always wins.  |
| Development tasks                     | `.kanban/board.json` (claude-kanban plugin) | Live task state        |
| Narrative state, blockers, priorities | `docs/PROJECT_STATE.md`                     | Snapshot; may be stale |
| Structure and data flow               | `docs/ARCHITECTURE.md`                      | Explanation            |
| Reasons behind choices                | `docs/DECISIONS/`                           | Decision records       |
| Dependabot, outside issues and PRs    | GitHub issues and PRs                       | Maintenance only       |

When notes disagree with the repository, act on the facts and correct the note.

## Session start

A `SessionStart` hook (`.claude/hooks/session-context.mjs`) runs on startup,
resume, clear and after compaction. It injects branch and sync state,
uncommitted files, recent commits, the board's Doing / Review / top To do
tickets and the content of `docs/PROJECT_STATE.md`. Do not re-read what it
already showed. Then:

1. If it reports the project memory as **not initialized**, tell the user and
   offer the `init-project` skill. One go-ahead covers the whole setup
   (memory, documentation, Kanban board, merge driver); do not initialize
   without it. If it reports the **Kanban board missing** in an initialized
   project, offer to create it the same way.
2. Reconcile: tickets in Doing or Review must match real branches and PRs
   (`gh pr list --state all --limit 10` only when the output raises doubts).
   Fix a wrong board or state file and say so.
3. Handle the user's request. Read `ARCHITECTURE.md` or decision records only
   when the task touches that area. When asked "what next", propose the top
   unblocked To do ticket.

If the hook output is missing (for example Node.js is unavailable), read
`docs/PROJECT_STATE.md` once and run `git status` instead.

## Task tracking with the Kanban board

The Kanban board is a default part of this workflow, like the project memory
and the session hook. It is optional only for external contributors and
environments without the maintainer's plugins; building, testing and
contributing never depend on it.

When the `kanban_*` tools are unavailable, say once per session that the
claude-kanban plugin is missing and point to "Installing the Kanban plugin" in
`docs/WORKFLOW.md`. Then work normally: read `.kanban/board.json` directly if
needed and never hand-edit it.

Trivial work (questions, typos, one-line fixes, read-only investigation) gets
no ticket. For everything else:

1. **Check first.** `kanban_board`, or `kanban_ticket` / `kanban_epic` for one
   slice. Reuse a matching ticket instead of creating a duplicate.
2. **Ticket.** `kanban_create_ticket` with a clear title and a body holding
   the goal and a checklist of acceptance criteria. Attach it to an epic when
   it belongs to a larger feature. Keep the default `review` status so the
   maintainer vets it; use `ready` only for a spec the user already agreed to
   in the conversation, `stub` when it still needs refining.
3. **Break down** large features into an epic with tickets that each fit
   roughly one pull request, linked with `depends_on`. Create only what is
   planned now; no speculative tickets.
4. **Prioritize** by position in To do (top = next). Propose an order; do not
   silently reshuffle the maintainer's.
5. **Start.** `kanban_claim` moves the ticket to Doing. Work on one branch per
   ticket (`<type>/K-<n>-<slug>`) or the session's existing worktree. Use the
   plugin's own worktrees (`kanban_worktree_start`) only inside a
   `/kanban:work` loop the user started.
6. **Progress and blockers.** `kanban_note` at milestones (approach chosen,
   partial result, scope change), not per commit. When blocked, note what
   blocks it, what was tried and what is needed, `kanban_release` the ticket,
   and record the blocker in `PROJECT_STATE.md`.
7. **Review.** After opening the PR, `kanban_move` the ticket to `review`
   with its branch and note the PR URL. The PR body names the ticket (`K-N`)
   and any issue (`Closes #N`).
8. **Done** is never set by hand: the board moves a ticket once its merge
   reaches local `master` (pull after merging). Never set `auto_merge` or
   enable `auto_review`; merging stays the maintainer's decision.

Maintenance (Dependabot updates, outside issues and PRs) stays on GitHub and
gets no board ticket. An outside issue accepted as development work gets a
ticket that mentions `GH #N`.

The board lives in the main working tree's `.kanban/board.json`, also during
worktree sessions. Commit board changes from there, never a worktree's stale
copy. Merges and rebases go through the ID-based merge driver in
`scripts/workflow/`; if the hook says it is not configured, tell the user. When
the driver flags a merge, check the listed tickets and report them. Never
resolve the file by keeping one whole side (`--ours`, `--theirs`, "newer
board"): that drops the other side's tickets and notes. Details:
`docs/WORKFLOW.md`.

## Project memory upkeep

Update `docs/PROJECT_STATE.md` and its "Last updated" / "Verified against"
lines after a meaningful milestone, before ending substantial work (including
what is left unfinished), and when blockers or priorities change. Keep it
under about 80 lines: it is injected into every session. Maintain
`ARCHITECTURE.md` and `docs/DECISIONS/` as `AGENTS.md` describes.

## Skills and tools

Use installed skills when their description matches the task; check the
available-skills list instead of assuming a skill exists. Typical matches:

- building or reshaping UI (a new screen, page or component, layout, visual
  style, theming, a redesign): invoke `frontend-design` (or the installed
  equivalent) once before writing that UI code. Not for small UI fixes such
  as copy, a logic bug or a single style property;
- architecture choices or large changes the maintainer should approve before
  implementation: propose the approach in plan mode first, and record the
  decision as `AGENTS.md` describes;
- finished non-trivial changes: a code review, security review or testing
  skill when one fits the change's risk. Changes touching health data, storage,
  exports, the app lock or anything that could transmit data always warrant a
  security review.

Invoke a skill once per task phase, not repeatedly, and never only to show it
exists. Skills that deploy, publish, send messages, schedule jobs, delegate to
external workers or run autonomous loops (for example `/kanban:work`) run only
when the user asks for them explicitly.

## Explaining substantial changes

After substantial implementation work, explain in the user's conversation
language: what changed; how it works technically; the important files and
functions; why this approach; alternatives and trade-offs; how to test it
yourself. Skip this for trivial changes. Explanations worth keeping go into
`ARCHITECTURE.md` or a decision record, in English.

## Pull requests

Follow the pull request template. Leave every PR open for the maintainer's
review; never merge, enable auto-merge or force-push without explicit
approval. Report the PR URL, the checks actually run and any pending CI.
