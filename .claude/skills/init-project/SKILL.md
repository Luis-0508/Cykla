---
name: init-project
description: Initialize a repository created from this template - project memory (docs/PROJECT_STATE.md), architecture documentation, decision records and template placeholders, all in one approved step. Use when the SessionStart context says project memory is NOT INITIALIZED, or when the user asks to set up or bootstrap the project.
---

# Initialize the project

Turn the template into this project's own workflow: project memory,
architecture documentation and decision records. They are one unit. Run once per repository; afterwards everything is
maintained as `CLAUDE.md` describes. `docs/WORKFLOW.md` explains the setup for
the user. Everything written here is in English.

## Rules

- One go-ahead from the user covers every step below.
- Ask rather than guess what the repository cannot tell (purpose, audience,
  first planned work).
- Describe only what exists. A new repository with no code gets short, honest
  documents ("No application code yet"), not an invented architecture.
- Never copy another project's state, issues or identifiers. Every project
  starts with its own records.
- Initialization is complete only when every step succeeded. Never report it
  as complete with a step skipped.

## Steps

1. **Prerequisites.** Before changing anything, check that `git` and `node`
   run. If one is missing, stop and tell the user.
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
   under about 80 lines. "Next priorities" names the planned GitHub issues in order.
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
8. **Planned work.** Create GitHub issues only from work the user actually
   planned and only after they confirm the list, since issues are public: a
   milestone per planned feature, issues that each fit roughly one pull
   request, each with a goal, acceptance criteria and "Depends on #N" where
   order matters. If no work is planned yet, create none and say so.
9. **Verify.** Run `node --test "scripts/workflow/*.test.mjs"` and
   `node .claude/hooks/session-context.mjs < /dev/null`. The hook must no
   longer report the memory as not initialized.
10. **Deliver.** Commit the documents on the working branch, open a pull
    request and leave it for the user to merge. Report what was
    initialized. If a step was blocked, say which and leave the changes
    uncommitted rather than working around it.
