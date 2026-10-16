---
name: init-project
description: Initialize a repository created from this template - project memory (docs/PROJECT_STATE.md), architecture documentation, decision records, the Kanban board with its git merge driver, and template placeholders, all in one approved step. Use when the SessionStart context says project memory is NOT INITIALIZED or the Kanban board is missing, or when the user asks to set up or bootstrap the project.
---

# Initialize the project

Turn the template into this project's own workflow: project memory,
architecture documentation, decision records, Kanban board and board merge
driver. They are one unit. Run once per repository; afterwards everything is
maintained as `CLAUDE.md` describes. `docs/WORKFLOW.md` explains the setup for
the user. Everything written here is in English.

## Rules

- One go-ahead from the user covers every step below. Do not ask separately
  whether they want a board; the board is part of the default setup.
- Ask rather than guess what the repository cannot tell (purpose, audience,
  first planned work).
- Describe only what exists. A new repository with no code gets short, honest
  documents ("No application code yet"), not an invented architecture.
- Never copy another project's state, board, ticket history or identifiers.
  Every project starts with its own empty board and its own records.
- Initialization is complete only when every step succeeded. Never report it
  as complete with a step skipped.

## Steps

1. **Prerequisites.** Before changing anything, check that `git` and `node`
   run and that the claude-kanban plugin is available (the `kanban_*` tools
   and the `kanban:init` skill are listed). If the plugin is missing, stop and
   tell the user:
   - the missing prerequisite is the claude-kanban plugin;
   - the installation procedure from "Installing the Kanban plugin" in
     `docs/WORKFLOW.md` (install, then restart Claude Code);
   - that initialization continues in a new session after the restart.

   Do not install plugins yourself. Only if the user explicitly says to go on
   without the board, do every step except the board, record "Kanban board
   not initialized: claude-kanban plugin missing" under Blockers in
   `PROJECT_STATE.md`, and report initialization as incomplete.
2. **Branch.** Create the working branch (for example `chore/init-project`)
   before editing anything. If that fails, stop and tell the user instead of
   editing the default branch.
3. **Gather facts cheaply.** `git log --oneline -20`, the README, manifest
   files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, …) and a
   shallow directory listing. Ask the user for the project's purpose and the
   first planned work if they are not evident.
4. **`docs/PROJECT_STATE.md`.** Rewrite it from the template: remove the
   `TEMPLATE: NOT INITIALIZED` comment, replace `PROJECT_NAME`, set "Last
   updated" to today and "Verified against" to the default branch and the
   short commit the facts were read from (for example `main` at `abc1234`),
   never the unmerged working branch. Fill each section with facts; keep it
   under about 80 lines. "Next priorities" names the board tickets.
5. **`docs/ARCHITECTURE.md`.** Describe the real structure, remove sections
   that do not apply, delete the template comment.
6. **`docs/DECISIONS/`.** Record decisions that were already made and that a
   maintainer might question, typically the stack choice
   (`0001-<stack>.md`). Add each to the table in `README.md`. None is fine.
7. **Template placeholders.** Search for `PROJECT_NAME`, `OWNER/REPO`,
   `REPOSITORY_URL` and `PROJECT_DIRECTORY`; replace those the facts allow and
   list the rest for the user. Add the project's package ecosystem to
   `.github/dependabot.yml` and adjust `.github/labeler.yml` globs when the
   layout is known.
8. **Kanban board.**
   - Run the `kanban:init` skill. It creates an empty board with the columns
     To do, Doing, Review and Done, never overwrites an existing board, and
     opens it in the browser.
   - Add `merge.sh` to `.kanban/.gitignore` and delete the generated
     `.kanban/merge.sh`: work lands through pull requests.
   - Enable the board merge driver in this clone (local git config, see
     "Kanban board merges" in `docs/WORKFLOW.md`):
     `git config merge.kanban-board.name "Kanban board merge by ticket ID"` and
     `git config merge.kanban-board.driver "node scripts/workflow/kanban-merge-driver.mjs %O %A %B"`.
   - Keep `auto_review` off and leave `auto_merge` unset on every ticket.
   - Create epics and tickets only from work the user actually planned: an
     epic per planned feature, tickets that each fit roughly one pull request,
     each with a goal, acceptance criteria and `depends_on` where order
     matters. Keep the default `review` status so the user vets them. If no
     work is planned yet, leave the board empty and say so; do not invent
     tickets.
9. **Verify.** Run `node --test "scripts/workflow/*.test.mjs"` and
   `node .claude/hooks/session-context.mjs < /dev/null`. The hook must no
   longer report the memory as not initialized, and must show the board
   without a "missing" or merge-driver warning. `kanban_board` must list the
   four columns and the tickets you created.
10. **Deliver.** Commit the documents together with `.kanban/board.json`,
    `.kanban/config.json` and `.kanban/.gitignore` on the working branch,
    open a pull request and leave it for the user to merge. Report what was
    initialized. If a step was blocked, say which and leave the changes
    uncommitted rather than working around it.
