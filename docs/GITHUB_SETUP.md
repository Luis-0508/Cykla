# GitHub setup

These are manual settings; repository files do not enable them. Do not change
visibility until the publication checks below are complete.

## About

Description: **Privacy-first, offline cycle and period tracker built with Expo,
React Native and SQLite. No accounts, backend or analytics.**

Topics: `expo`, `react-native`, `typescript`, `period-tracker`, `cycle-tracker`,
`privacy`, `offline-first`, `sqlite`.

## Actions and security

- Enable GitHub Actions and permit the official `actions/*` and
  `github/codeql-action` actions used here. Keep the default token read-only;
  individual workflows request only their needed permissions.
- Enable dependency graph, Dependabot alerts/security updates, and available
  secret scanning/push protection. Weekly Dependabot version updates cover npm
  and Actions. Review Expo packages together against the SDK compatibility check;
  major upgrades require deliberate testing. Do not auto-merge dependency PRs.
- Enable **Private vulnerability reporting** under repository security settings,
  if available for the repository, and verify the reporting button. Otherwise
  publish a monitored private reporting contact in SECURITY.md before publication.
- Use the checked-in **advanced CodeQL setup**, not a duplicate default setup.
  Private-repository scanning may require a GitHub Code Security entitlement;
  if unavailable, do not make its check required until scanning is available.
- Create labels: `ui`, `database`, `domain`, `prediction`, `privacy`, `security`,
  `documentation`, `dependencies`, `tests`, `ci`. The labeler uses the base branch's
  configuration; it becomes active after these files reach `master`. It never
  executes pull-request code or checks out its head, including on fork PRs.

## Ruleset for master (solo development)

Create an active branch ruleset targeting **master**:

- Require a pull request; **zero required approvals**. Do not require code-owner
  approval or approval by someone other than the last pusher.
- Require the status check **Quality** (workflow **CI**, job `quality`). Select
  GitHub Actions as its source. Run the workflow once so GitHub can list it.
- After a successful CodeQL run and entitlement verification, also require
  **Analyze JavaScript and TypeScript** (workflow **CodeQL**, job `analyze`).
- Require branches to be up to date before merging if desired; this runs checks
  against the latest base and is practical for a solo repository. Avoid a merge
  queue unless workflows are later extended for `merge_group` events.
- Block force pushes and branch deletion. Keep a narrowly scoped repository-admin
  emergency bypass so a broken workflow cannot lock the sole maintainer out;
  normal changes should still use PRs and passing checks.
- Do not require the labeler as a status check or add an external reviewer rule.

Verify the exact displayed check names on the first PR before enabling enforcement.
Keep **Squash merging** enabled and use it as the normal merge method. Enable
**Automatically delete head branches** for merged PRs. This is a recommendation,
not an instruction to delete any current branch now.

## Daily workflow

Feature branch → changes and regression tests → local checks → commits → push →
PR to `master` → CI and self-review → squash merge. Use synthetic screenshots only.

For the initial hardening branch, if it has not been pushed:

```sh
gh auth login
git push -u origin repo-hardening
gh pr create --base master --head repo-hardening
```

Review and merge manually after Actions pass. Scheduled CodeQL and Dependabot
configuration are effective from the default branch.

## Before public visibility

Review all Git history, branches, tracked files, issue attachments and Actions
artifacts for secrets, personal health records and private identifiers. Ignore
patterns do not remove previously committed data. Rotate any exposed secrets;
do not rewrite history as part of routine hardening. Verify licensing/provenance
of assets and dependencies, SECURITY.md's reporting channel, and the known risks
in [HARDENING.md](HARDENING.md). Publishing source does not certify the app for
medical use or constitute a production/privacy compliance review.
