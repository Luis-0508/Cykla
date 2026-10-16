# Project state

Narrative snapshot of where Cykla stands. **The repository is authoritative:** if git, the
code, the task board or GitHub disagree with this file, trust them and correct this file.

- Last updated: 2026-10-16
- Verified against: `master` at `a8b7823`

## What exists

- Version 0.1.0, an offline-first Expo SDK 58 app (iOS, Android, web) with local SQLite;
  no backend, account, analytics or network transmission.
- Onboarding, daily editor (bleeding, pain, mood, energy, sleep, symptoms, notes), Today
  overview, monthly calendar, Trends.
- Rule-based local prediction with date range, confidence and explanation; cycle
  exclusions; provisional estimates for sparse or ambiguous history (PRs #32, #36).
- JSON and CSV export, restore from a validated JSON backup (PR #24), deletion of all
  data, optional app lock, neutral daily reminder, light and dark mode.
- German and English interface; in-app roadmap screen (PR #29).
- Data-integrity protections for failed reads and concurrent SQLite access (PR #31).
- Tests: Vitest unit, SQLite integration (`node:sqlite`) and service tests with coverage;
  CI runs typecheck, lint, format, tests, coverage, Expo Doctor and the bundle export.
  CodeQL, PR labeler and Dependabot are active.
- Development workflow: local Kanban board, this project memory, SessionStart hook and
  workflow tests (decision 0001).

See [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together, [DECISIONS/](DECISIONS/README.md)
for why, and [ROADMAP.md](ROADMAP.md) for the version plan.

## Active work

- No tickets in Doing or Review.
- Workflow migration on `chore/unified-claude-workflow`; PR open for review. Maintenance
  work, no ticket.
- Open Dependabot PRs #54, #55, #65 to #68.

## Blockers

- None in code. Device validation and the medical, legal and privacy reviews need real
  devices and outside reviewers (K-4, K-7).

## Next priorities

Version 0.2 Hardening (epic EP-1). The board order is the priority; all tickets are `stub`s
whose specs need refining and approval:

1. K-1 Encrypted local database and backup strategy
2. K-2 Automated component and end-to-end tests
3. K-3 Screen-reader and Dynamic Type review
4. K-4 Device validation of app lock, export cleanup and restore
5. K-5 Resolve the remaining dependency audit findings
6. K-6 Safe migrations and recovery tests
7. K-7 Medical, legal and privacy review

Version 0.3 (extended tracking) stays in `ROADMAP.md` until it is planned in detail.

## Known limitations

- The database is unencrypted; React Native UI has no automated tests.
- `npm audit` is not clean (see HARDENING.md); the recorded audit predates SDK 58.
- Some documents still name Expo SDK 57 (README tech stack, CONTRIBUTING, HARDENING), and
  ROADMAP.md still describes the JSON restore (#24) as in review although it is merged.
