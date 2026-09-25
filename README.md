# Cykla

Cykla is a free, open-source, offline-first cycle, period, and health tracker for
iOS and Android. The MVP works without an account or backend. Health data remains
in a local SQLite database.

> Cykla records data and provides estimates. The app does not provide diagnoses,
> is not a reliable method of contraception, and does not replace medical advice.

## MVP Features

- German onboarding covering the user's goal, most recent period, and typical cycle
  and bleeding duration
- “Today” home screen with recorded status and cautiously worded predictions
- monthly calendar with clearly separated recorded and calculated markers
- daily editor for bleeding, pain, mood, energy, sleep, symptoms, and notes
- rule-based local period prediction with a date range, confidence level, and explanation
- basic cycle statistics and the ability to manually exclude individual cycles
- local daily reminder with neutral wording
- optional app lock using device security
- light, dark, and system appearance modes
- JSON and CSV exports, plus complete local data deletion
- no advertising, external analytics SDK, account, or cloud service

## Installation

Requirements:

- Node.js 24.12 or newer within Node 24 (see `.node-version`; SQLite tests use `node:sqlite`)
- npm
- Expo Go or an Android/iOS simulator

```bash
npm ci
npm start
```

You can then launch the app by scanning the QR code with Expo Go, or by pressing
`a` or `i` in the terminal.

The project targets Expo SDK 57. Use Expo Go for SDK 57 or a compatible
development build. Preserve the existing Expo Go app and its local data when testing upgrades.

Additional commands:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npm run format
npm test
```

On Windows, you can alternatively double-click `start-ios.bat` to use a physical
iPhone with Expo Go, or `start-web.bat` to launch the web preview.

Local notifications and the biometric app lock require a supported mobile device.
The web build is intended as a responsive development preview and is available at
`http://localhost:8082` after running `npm run web`. The startup script adds the
cross-origin headers required by Expo SQLite/WASM.

## Architecture

```text
app/                         Expo Router routes and screens
  (tabs)/                    Today, Calendar, Log, Trends, Settings
  day/[date].tsx             daily editor
src/
  components/                reusable UI and calendar components
  config/branding.json       shared source for the name, IDs, and brand colors
  database/                  migrations and SQLite repository
  domain/                    pure date, cycle, statistics, and prediction logic
  hooks/                     TanStack Query bridge between the UI and SQLite
  i18n/                      German text catalog with sections per area
  services/                  exports, local reminders, and app lock
  store/                     transient UI state managed with Zustand
  theme/                     custom light/dark design system
```

React components do not calculate predictions. `src/domain/` is independent of
React Native and tested with Vitest. React Hook Form and Zod validate the onboarding
flow and daily editor. TanStack Query coordinates reading and invalidating local
SQLite data; there are no network requests.

## Data Model

Recorded data is stored in `daily_entries` and `symptom_entries`. Manual cycle
exclusions are stored separately in `cycle_exclusions`. Settings are stored as
simple key-value pairs in `app_settings`.

Versioned, transactional migrations use SQLite `user_version`, preserve existing
v1 data, and reject unsupported newer schemas. Stored settings and relevant entry
values are validated at read boundaries with Zod. See [database notes](docs/DATABASE.md).

Calculated data is **not** stored:

- expected period start
- prediction window
- confidence level
- estimated ovulation
- possible fertile window

These values are calculated at runtime from recorded period days. This prevents a
calculated day from accidentally appearing as a user entry or being included in an
export.

## Prediction Model

1. Consecutive recorded bleeding days form periods.
2. The difference between two period start dates produces a complete cycle length.
3. More recent cycles receive a weight of `0.85 ^ age`.
4. Clear outliers remain in the data but receive an additional lower weight.
5. Manually excluded cycles are not included.
6. The weighted mean determines the calculated start date.
7. Sample variation determines the width of the visible prediction window.
8. Fewer than three complete cycles always produce low confidence; “high” confidence
   is only assigned after six stable cycles.

All calculations use local calendar dates in `YYYY-MM-DD` format so that travel or
time-zone changes cannot shift a period day to a different calendar date.

## Privacy and Security

The MVP does not transmit health data. It contains no advertising or external
analytics SDK. JSON and CSV exports are created locally and then shared through the
system share dialog. Mobile files use temporary cache storage. Android retains
shared files until the next cold start so recipients can still read them; iOS cleans
up after sharing completes. Startup retries cleanup after interruptions. The biometric app lock stores only its enabled state in
SecureStore; authentication is handled by the operating system.

SQLite data is stored locally in the MVP but is not additionally encrypted field by
field. A production-ready release should add encrypted backups, a threat model, a
data protection impact assessment, and legal review. See
[PRIVACY.md](./PRIVACY.md) for details and [SECURITY.md](./SECURITY.md) for private
vulnerability reporting with synthetic data only.

## Development Data

The app does not include seed or demo data during normal use. Onboarding creates only
the most recent period confirmed by the user. An optional development mode with demo
data is intentionally not included at this time.

## Quality

CI runs on pull requests to and pushes on `master`. Local and CI checks use the
same scripts:

```bash
npm ci
npm run typecheck
npm run lint
npm run format
npm test
npm run test:coverage
npm run doctor
npm run build:smoke
```

Tests cover domain/date/prediction edge cases, real SQLite migrations and repository
operations, stored-data validation, export serialization/cleanup, app-lock lifecycle
and local reminders. Coverage reports are in `coverage/` (HTML and LCOV), also
uploaded by CI; no minimum percentage or external service is required. Coverage
currently measures domain, database and services, not React Native UI.

The smoke test exports Web, iOS and Android bundles; it is not a signed native build
or device test. See [hardening notes](docs/HARDENING.md) for remaining dependency
risks and device checks. Use feature branches and PRs; see [CONTRIBUTING.md](CONTRIBUTING.md)
and [GitHub setup](docs/GITHUB_SETUP.md) for solo-maintainer rules and required checks.

German text extraction is incremental: onboarding, settings, lock, shared states,
navigation and notifications use the catalog. Remaining daily-editor/calendar/home
and prediction copy can move in subsequent changes. English translation is not
implemented.

## Intentionally Not Implemented Yet

- accounts, backend, cloud synchronization, and multi-device use
- pregnancy mode and partner access
- AI assistant, diagnoses, or medical chatbot
- community features, advertising, subscriptions, and paywalls
- Apple Health, Health Connect, basal body temperature, and ovulation tests
- medical article library and medical report
- English user interface (German text centralization is ongoing)
- encrypted SQLite database and encrypted automatic backups

See [ROADMAP.md](./ROADMAP.md) for planned next steps.

## Contributing and License

Contributions are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md). Cykla is licensed
under **AGPL-3.0-only** (GNU Affero General Public License version 3 only); see
[LICENSE](./LICENSE) for the complete official text.
