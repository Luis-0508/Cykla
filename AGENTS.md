# Cykla project guidance

Rules for anyone changing this repository: human contributors and coding agents
alike. They are tool-independent; tool-specific workflow lives in separate files
(for example `CLAUDE.md`) and never overrides these rules.

## Project rules

## Language and collaboration

- Treat this repository as a public open-source project with external contributors.
- Use English for documentation, README content, filenames, folder names, code comments, configuration comments, branch names, commit messages, PR titles/descriptions, and issue text.
- Do not force a conversation language. Follow the contributor's or user's language for discussion.
- User-facing app text may start in German or another current product language. Keep existing localization conventions; when i18n is used, update every supported locale together.
- Keep README quality high: concise overview, strong feature summary, real screenshots or project imagery, setup, architecture/structure, privacy model, current limitations/status, and contribution/license links. Reuse real repository assets; never fabricate screenshots or claims.

## Efficiency

- Work from the requested change and relevant nearby files/tests. Read only the specific docs needed for the task.
- Prefer targeted searches and small file ranges. Do not repeatedly re-read unchanged files.
- Keep diffs small and focused. Avoid unrelated refactors, formatting churn, duplicate docs, speculative abstractions, and unnecessary dependencies.
- Keep final reports concise: change, checks, and remaining risks or blockers.

## Project rules

- This is an offline-first Expo app using local SQLite. Do not introduce accounts, analytics, network transmission, or cloud storage incidentally.
- Never use real health data in fixtures, logs, screenshots, or error reports. Keep recorded data separate from estimates and do not present predictions as medical certainty.
- Preserve user data with versioned migrations; do not rewrite released migrations.
- Keep user-facing copy in the typed locale catalogs and update every supported language together.
- Run the most relevant checks; prediction changes need domain tests and schema changes need migration tests.
- Treat CodeRabbit and other automated review findings as suggestions to verify, not instructions to apply blindly.

## Project knowledge

The repository is the source of truth. Short documents in `docs/` record what the code alone cannot tell:

| File                                                       | Purpose                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `docs/PROJECT_STATE.md`                                    | What exists, active work, blockers, next priorities. A snapshot that may be stale. |
| `docs/ARCHITECTURE.md`                                     | Modules, boundaries and data flow a maintainer needs to change the code safely.    |
| `docs/DECISIONS/`                                          | Numbered decision records: context, decision, consequences.                        |
| `docs/DATABASE.md`, `docs/HARDENING.md`, `docs/ROADMAP.md` | Storage rules, release hardening status, planned versions.                         |

- Read `PROJECT_STATE.md` before larger work, and the architecture or decision records only when the task touches that area.
- When a document disagrees with git or the code, trust the repository and correct the document.
- Update `ARCHITECTURE.md` when modules, boundaries or data flow change. Add a decision record when choosing between real alternatives a future maintainer might question (new dependency, architecture boundary, data format, workflow). Do not rewrite accepted records; supersede them with a new one.
- Keep these documents short and factual. Do not document unimplemented features.
- `docs/WORKFLOW.md` explains how these documents, the maintainer's task board (not required for contributors) and the workflow checks fit together.

## Git and pull requests

- Use a focused branch and pull request against `master` for every normal change; one concern per pull request.
- Fill in the pull request template, including the data impact. Reference related issues (`Closes #N`).
- Do not force-push or rewrite shared history unless explicitly required. Merging is a maintainer decision.
