@AGENTS.md

# Claude Code workflow for Cykla

`AGENTS.md` (imported above) holds the project rules and wins over anything
here. This file only adds how Claude Code sessions keep continuity, track work
and use installed tools. Personal preferences (conversation language, model
delegation) belong in the user's global `~/.claude/CLAUDE.md`, not here.

## Sources of truth

| What                                  | Where                        | Authority              |
| ------------------------------------- | ---------------------------- | ---------------------- |
| Code, history, branches, PRs          | git and GitHub               | Highest. Always wins.  |
| Development tasks                     | GitHub issues and milestones | Live task state        |
| Narrative state, blockers, priorities | `docs/PROJECT_STATE.md`      | Snapshot; may be stale |
| Structure and data flow               | `docs/ARCHITECTURE.md`       | Explanation            |
| Reasons behind choices                | `docs/DECISIONS/`            | Decision records       |

When notes disagree with the repository, act on the facts and correct the note.

## Session start

A `SessionStart` hook (`.claude/hooks/session-context.mjs`) runs on startup,
resume, clear and after compaction. It injects branch and sync state,
uncommitted files, recent commits, open pull requests, issues assigned to the
user and the content of `docs/PROJECT_STATE.md`. Do not re-read what it
already showed. Then:

1. If it reports the project memory as **not initialized**, tell the user and
   offer the `init-project` skill; do not initialize without a go-ahead.
2. Reconcile: "Active work" in `PROJECT_STATE.md` must match the open pull
   requests and assigned issues. Fix a stale state file and say so.
3. Handle the user's request. Read `ARCHITECTURE.md` or decision records only
   when the task touches that area. When asked "what next", propose the first
   unblocked issue from "Next priorities" in `PROJECT_STATE.md`.

If the hook output is missing (for example Node.js is unavailable), read
`docs/PROJECT_STATE.md` once and run `git status` instead.

## Task tracking with GitHub issues

Planned work lives in GitHub issues, grouped by milestone (one milestone per
larger feature). Each issue fits roughly one pull request and holds the goal,
acceptance criteria and a "Depends on" list. Issues migrated from the former
Kanban board say so in their first line ("Migrated from Kanban ticket K-n");
older commits and documents still use those K-n IDs.

Trivial work (questions, typos, one-line fixes, read-only investigation) gets
no issue. For everything else:

1. **Check first.** `gh issue view N` for the issue at hand, or
   `gh issue list --milestone "<name>"` for one slice. Avoid unfiltered lists
   and `--json body` dumps of many issues. Reuse a matching issue instead of
   creating a duplicate.
2. **New work.** Ask before creating issues; they are public. Use a clear
   title, a body with goal, acceptance criteria and "Depends on #N", a
   milestone and labels. Create only what is planned now.
3. **Start.** Assign the issue to the maintainer (`gh issue edit N --add-assignee @me`)
   and work on one branch per issue (`<type>/<n>-<slug>`).
4. **Progress and blockers.** Comment on the issue at milestones (approach
   chosen, scope change), not per commit. Record blockers in
   `PROJECT_STATE.md` as well.
5. **Review.** The PR body says `Closes #N`; GitHub closes the issue when the
   maintainer merges.

Priorities are the order in "Next priorities" in `PROJECT_STATE.md`; propose
changes to it, do not silently reshuffle it. Dependabot and outside
contributions follow the same GitHub flow.

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
external workers or run autonomous loops run only when the user asks for them
explicitly.

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
