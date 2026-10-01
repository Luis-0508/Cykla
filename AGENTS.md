# Cykla project guidance

- Work from the requested change and relevant nearby files/tests. Read `README.md` for orientation, `docs/DATABASE.md` for schema changes, and `PRIVACY.md` or `SECURITY.md` for relevant data-handling changes. Follow `CONTRIBUTING.md` when preparing a PR; do not preload every document for a small edit.
- This is an offline-first Expo SDK 57 app using local SQLite. Do not introduce accounts, network transmission, analytics, or cloud storage as incidental changes.
- Never use real health data in fixtures, logs, screenshots, or error reports. Keep recorded data separate from estimates; prediction logic belongs in pure functions under `src/domain/` and must not be presented as medical certainty.
- Preserve existing user data when changing SQLite: add a new versioned migration; do not rewrite released migrations. Keep user-facing copy in the typed catalogs under `src/i18n/locales/` and add every key to all languages.
- Prefer small, focused diffs without unrelated rewrites, formatting churn, or dependency changes.
- Run relevant checks for the change; prediction changes need domain tests, and schema changes need migration tests. Follow the full PR checks in `CONTRIBUTING.md` when opening a PR. State what could not be verified and why.
- Keep the final report brief: change, checks, and outstanding risks or blockers.
