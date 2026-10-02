# GitHub setup

These are manual repository settings; files in the repository do not enable them.
The repository is public. Use this page as the maintainer checklist and re-check
it after changing settings.

## About

Description: **Free, open-source, offline-first period and cycle tracker for iOS
and Android, built with Expo and local SQLite storage.**

Topics: `expo`, `react-native`, `typescript`, `period-tracker`, `cycle-tracker`,
`menstrual-cycle`, `privacy`, `offline-first`, `local-first`, `sqlite`.

Social preview: upload `docs/images/social-preview.png` (1280 × 640) under
**Settings → General → Social preview**. Leave the website field empty until a
project page exists. Disable unused Wiki and Projects tabs so visitors land on
the README, issues and pull requests.

## Actions and security

- Enable GitHub Actions and permit the official `actions/*` and
  `github/codeql-action` actions used here. Keep the default token read-only;
  individual workflows request only their needed permissions.
- Enable dependency graph, Dependabot alerts and security updates, and secret
  scanning with push protection. Weekly Dependabot version updates cover npm and
  Actions. Review Expo packages together against the SDK compatibility check;
  major upgrades require deliberate testing. Do not auto-merge dependency PRs.
- Enable **Private vulnerability reporting** under the repository's security
  settings and verify the reporting button. Otherwise publish a monitored private
  reporting contact in [SECURITY.md](../SECURITY.md).
- Use the checked-in **advanced CodeQL setup**, not a duplicate default setup. The
  job condition `github.event.repository.private == false` skips analysis while a
  repository is private; on this public repository it runs on pull requests,
  pushes to `master`, a weekly schedule and manual dispatch. A skipped check is
  not evidence of a security scan.
- Keep the labels `ui`, `database`, `domain`, `prediction`, `privacy`, `security`,
  `documentation`, `dependencies`, `tests` and `ci` for the
  [labeler](../.github/labeler.yml), and `bug` and `enhancement` for the issue
  templates. The labeler uses the base branch's configuration and never executes
  pull-request code or checks out its head, including on fork PRs.

## Ruleset for master (solo development)

Create an active branch ruleset targeting **master**:

- Require a pull request; **zero required approvals**. Do not require code-owner
  approval or approval by someone other than the last pusher.
- Require the status check **Quality** (workflow **CI**, job `quality`). Select
  GitHub Actions as its source.
- Require **Analyze JavaScript and TypeScript** (workflow **CodeQL**, job
  `analyze`) once a successful actual analysis (not a skipped run) is listed.
- Require branches to be up to date before merging if desired; this runs checks
  against the latest base and is practical for a solo repository. Avoid a merge
  queue unless workflows are later extended for `merge_group` events.
- Block force pushes and branch deletion. Keep a narrowly scoped repository-admin
  emergency bypass so a broken workflow cannot lock the sole maintainer out;
  normal changes should still use PRs and passing checks.
- Do not require the labeler as a status check or add an external reviewer rule.

Verify the exact displayed check names on a recent PR before enabling enforcement.
Keep **Squash merging** enabled and use it as the normal merge method. Enable
**Automatically delete head branches** for merged PRs. This is a recommendation,
not an instruction to delete any current branch now.

## Daily workflow

Feature branch → changes and regression tests → local checks → commits → push →
PR to `master` → CI and self-review → squash merge. Use synthetic screenshots only.
The local checks are listed in [CONTRIBUTING.md](../CONTRIBUTING.md).

Scheduled CodeQL and Dependabot configuration take effect from the default branch.

## Public repository hygiene

Periodically review Git history, branches, tracked files, issue attachments and
Actions artifacts for secrets, personal health records and private identifiers.
Ignore patterns do not remove previously committed data. Rotate any exposed
secrets; do not rewrite history as part of routine hardening. Verify the licensing
and provenance of assets and dependencies, SECURITY.md's reporting channel, and the
known risks in [HARDENING.md](HARDENING.md). Publishing source does not certify the
app for medical use or constitute a production or privacy compliance review.
