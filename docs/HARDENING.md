# Hardening notes and remaining release work

## Scope and baseline

The app remains Expo SDK 54 / React Native / TypeScript with local SQLite, TanStack
Query and Zustand. No backend, account, analytics, cloud service or product feature
was added. The initial checkout had 14 passing tests, passing typecheck/lint/format
and a working web export. Expo Doctor initially failed on a missing expo-font peer
and four SDK patch mismatches; these are corrected.

Node 24 is used consistently in local tooling and CI. SQLite integration tests use
the built-in `node:sqlite` module (currently emits an experimental warning), not a
new app dependency. Vitest and its V8 coverage provider are pinned together.

## Dependency audit: 2026-09-17

The initial audit reported 29 affected packages (16 moderate, 13 high). Compatible
updates and the tested PostCSS override reduce this to **21 affected packages
(13 moderate, 8 high)**. These counts include parent-package advisory propagation;
they are not 21 independent defects. Audit is **not clean**.

Remaining root findings:

| Dependency                                          | Exposure requiring review                                                                          | Next step                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `decode-uri-component` via Expo Router/query-string | Malformed URL decoding can cause denial of service; offline use does not eliminate deep-link input | Upgrade to a compatible patched router/dependency stack and test malformed links        |
| `image-size` via Metro                              | Malformed image parsing can hang development/build tooling                                         | Use trusted assets; upgrade the SDK/Metro stack and rerun exports                       |
| `uuid` via xcode/Expo config plugins                | Buffer bounds issue in affected UUID APIs in native project tooling                                | Upgrade compatible config/native tooling; verify actual API usage before accepting risk |

Advisory sources: [decoder](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
[image parser](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr),
[additional image formats](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq),
[UUID](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

`@expo/metro-config` pins an older PostCSS minor. A narrow npm override selects
`^8.5.28` within PostCSS major 8; the lockfile, npm ci, Expo Doctor and all-platform
export verify this combination. Remove the override when the SDK supplies a
patched version itself. No incompatible image-size/uuid override, forced Router
downgrade, or SDK major migration was applied. Review remaining findings before
public distribution; do not use `npm audit fix --force` blindly. Run `npm audit`
regularly; Dependabot and CodeQL complement rather than replace that review.

## Privacy/device validation still required

Use only invented data on actual iOS and Android devices:

1. Enable app lock, background/foreground the app, open the switcher and notification
   shade, interrupt authentication, cancel/fail/succeed, and change lock settings.
   Verify unsaved forms survive temporary hiding and no sensitive view flashes.
2. Export JSON/CSV to multiple share targets, cancel, induce an error, and terminate
   during sharing. On Android verify recipient access after the share promise
   settles and cleanup at the next cold start. On iOS verify cleanup after native
   completion. Foregrounding must not remove files; no timeout is treated as
   proof of recipient completion.
3. Upgrade a synthetic v1 database and reinstall cleanly on Expo SQLite and web
   WASM; the Node SQLite tests verify SQL semantics but not platform integration.
4. Test web downloads and SQLite with the existing cross-origin headers; export
   compilation alone does not prove browser runtime behavior.

The app-switcher protection is a JavaScript AppState gate, not a native screenshot
prevention guarantee. See [React Native AppState](https://reactnative.dev/docs/appstate).
SecureStore read failures now fail closed. The OS handles authentication; the app
never implements PIN/password cryptography. Device-passcode-only availability and
Face ID behavior must be tested in a development build, not assumed from Expo Go.

Exports use cache storage. Preparation failures clean up immediately; after sharing
starts, Android (and unknown native platforms) retain files until the next cold
start, including rejection/cancellation. iOS cleans up after its native completion
callback. Startup cleanup retries on later launches if deletion fails. Recipient copies,
browser downloads, old document-directory exports and forensic erasure are outside
this cleanup's guarantee. The database remains unencrypted; backup strategy,
threat modeling and production privacy review are still open.

## GitHub and public readiness

GitHub CLI was not authenticated during local setup. No repository visibility,
rules, reviewers or security settings were changed. See [GITHUB_SETUP.md](GITHUB_SETUP.md)
for precise manual steps. Local checks do not prove a hosted Actions/CodeQL run;
verify the first PR before requiring status checks. CodeQL is deliberately skipped
for this personally owned private repository. The public-only job condition enables
analysis on subsequent workflow events after publication. Only after a successful
actual scan should its check become required.

Workflow actions use verified release commit SHAs. Dependabot keeps those pins
updatable. The labeler follows the official [changed-files configuration](https://github.com/actions/labeler)
and uses only trusted base-branch configuration with no PR checkout.

The full LICENSE was downloaded unchanged from the
[GNU AGPL v3 text](https://www.gnu.org/licenses/agpl-3.0.txt). The project selects
`AGPL-3.0-only` in package metadata and README. No invented security/support email
is published; the unused example.invalid branding contact was removed.

Text extraction is deliberately incremental. Settings, onboarding, lock, shared
states and notifications are centralized. Other screens and domain explanation
copy still contain German strings; no English locale is claimed.
