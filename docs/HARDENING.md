# Hardening notes and remaining release work

These notes record the security and privacy hardening of the MVP and the work
that remains before a public app release. The user-facing privacy model is in
[PRIVACY.md](../PRIVACY.md); vulnerability reporting is in
[SECURITY.md](../SECURITY.md).

## Scope and baseline

The app is Expo SDK 57 / React Native / TypeScript with local SQLite, TanStack
Query and Zustand. The hardening pass, originally done on Expo SDK 54, added no
backend, account, analytics, cloud service or product feature. Expo Doctor
initially failed on a missing `expo-font` peer and four SDK patch mismatches;
these were corrected.

Node 24 is used consistently in local tooling and CI. SQLite integration tests use
the built-in `node:sqlite` module (it currently emits an experimental warning), not
a new app dependency. Vitest and its V8 coverage provider are pinned together.

## Dependency audit: 2026-10-02 (Expo SDK 57)

`npm audit` reports **17 affected packages (13 moderate, 4 high)**. These counts
include parent-package advisory propagation; they are not 17 independent defects.
Audit is **not clean**. The `npm audit fix` suggestions are semver-major
downgrades of Expo or Expo Router and must not be applied.

Remaining root findings:

| Dependency                                          | Exposure requiring review                                                                             | Next step                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `decode-uri-component` via Expo Router/query-string | Malformed URL decoding can cause denial of service; offline use does not eliminate deep-link input    | Upgrade to a compatible patched router/dependency stack and test malformed links        |
| `node-forge` via `@expo/cli`                        | Signature verification flaw in development tooling (code-signing certificates); not in the app bundle | Upgrade to a patched Expo CLI; the app does not use Expo Updates code signing           |
| `uuid` via xcode/Expo config plugins                | Buffer bounds issue in affected UUID APIs in native project tooling                                   | Upgrade compatible config/native tooling; verify actual API usage before accepting risk |

Advisory sources: [decoder](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
[node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv),
[UUID](https://github.com/advisories/GHSA-w5hq-g745-h8pq). The earlier `image-size`
findings via Metro no longer appear on SDK 57.

`package.json` overrides PostCSS for `@expo/metro-config` with `^8.5.28` within
PostCSS major 8; the lockfile, `npm ci`, Expo Doctor and the all-platform export
verify this combination. `@expo/metro-config` 57 itself declares `^8.5.14`, so
check whether the override is still needed and remove it once the SDK's own
range is patched. No forced Router downgrade or SDK major migration was applied.
Review remaining findings before public distribution; do not use
`npm audit fix --force` blindly. Run `npm audit` regularly; Dependabot and CodeQL
complement rather than replace that review.

## Privacy and device validation still required

Use only invented data on actual iOS and Android devices:

1. Enable the app lock, background and foreground the app, open the app switcher
   and notification shade, interrupt authentication, cancel, fail and succeed, and
   change lock settings. Verify that unsaved forms survive temporary hiding and no
   sensitive view flashes.
2. Export JSON and CSV to multiple share targets, cancel, induce an error, and
   terminate during sharing. On Android verify recipient access after the share
   promise settles and cleanup at the next cold start. On iOS verify cleanup after
   native completion. Foregrounding must not remove files; no timeout is treated
   as proof of recipient completion.
3. Upgrade a synthetic v1 database and reinstall cleanly on Expo SQLite and web
   WASM; the Node SQLite tests verify SQL semantics but not platform integration.
4. Test web downloads and SQLite with the existing cross-origin headers; export
   compilation alone does not prove browser runtime behavior.

The app-switcher protection is a JavaScript AppState gate, not a native screenshot
prevention guarantee. See [React Native AppState](https://reactnative.dev/docs/appstate).
SecureStore read failures fail closed. The OS handles authentication; the app
never implements PIN or password cryptography. Device-passcode-only availability
and Face ID behavior must be tested in a development build, not assumed from
Expo Go.

Export cleanup behavior is described in [PRIVACY.md](../PRIVACY.md#export).
Recipient copies, browser downloads, old document-directory exports and forensic
erasure are outside its guarantee. The database remains unencrypted; backup
strategy, threat modeling and production privacy review are still open.

## GitHub and public readiness

The repository is public. CodeQL analysis runs on pull requests, pushes to
`master` and a weekly schedule. Private vulnerability reporting, secret scanning
and the `master` ruleset are manual settings; see
[GITHUB_SETUP.md](GITHUB_SETUP.md) for the checklist and verify each setting there
rather than assuming it from repository files.

Workflow actions use verified release commit SHAs. Dependabot keeps those pins
updatable. The labeler follows the official
[changed-files configuration](https://github.com/actions/labeler) and uses only
trusted base-branch configuration with no PR checkout.

The full LICENSE was downloaded unchanged from the
[GNU AGPL v3 text](https://www.gnu.org/licenses/agpl-3.0.txt). The project selects
`AGPL-3.0-only` in package metadata and README. No invented security or support
email is published.

## Localization

All user-facing app copy lives in the typed German and English catalogs under
`src/i18n/locales/`. German text remains outside them in two places by design:
the internal invalid-date error message in `src/domain/dateOnly.ts`, and the notice and CSV
column names in export files, which stay German for format stability.
