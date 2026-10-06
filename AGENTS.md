# Cykla project guidance

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
