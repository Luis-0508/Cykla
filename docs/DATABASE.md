# Database

Cykla stores recorded data in a local SQLite database through `expo-sqlite`
(WASM on the web). No ORM or additional runtime database is used.

| Table              | Contents                                                     |
| ------------------ | ------------------------------------------------------------ |
| `daily_entries`    | One row per date: bleeding, mood, pain, energy, sleep, notes |
| `symptom_entries`  | Symptoms per date; deleted together with their daily entry   |
| `cycle_exclusions` | Cycle starts the user excluded from the prediction           |
| `app_settings`     | Key-value settings such as goal, typical lengths and theme   |

Estimates are never stored; they are derived at runtime by `src/domain/`.

## Migrations

`src/database/schema.ts` owns the ordered registry. `migrations/v1.ts` is the
original MVP schema, unchanged structurally. Existing version-1 installations
skip it; empty databases apply it. There is deliberately no artificial v2.

For a schema change, add `migrations/v2.ts` (then v3, etc.) and append it to the
registry. Versions must be unique and consecutive from 1; released migrations
must not be edited. Keep each migration small and preserve user records.

Each migration and its `PRAGMA user_version` update run in the same transaction.
If it fails, SQLite rolls back that migration and version; previously completed
migrations remain committed and retries resume at the failed version. Databases
from newer app versions are rejected without writes or downgrades. Do not put
transaction statements, `VACUUM` or connection PRAGMAs inside migration bodies.

## Initialization

WAL and foreign keys are enabled on every initialization, including existing
databases. `SQLiteProvider` awaits initialization before consumers mount. The
web-compatible Expo transaction API is used; no other connection work may run
concurrently during initialization.

## Runtime access policy

All runtime SQL goes through `repository.ts` using the single `SQLiteProvider`
database instance. `access.ts` queues complete repository operations per instance;
it holds the connection through commit or rollback and releases it after errors.
This includes single-statement reads/writes, since otherwise they could join an
unrelated transaction. Operations on other connections and non-database work are
not queued. Transaction callbacks use raw SQL or private unqueued helpers; calling
another queued repository operation from a callback would deadlock.

Entry/symptom reads use one read transaction for both SELECTs. Entry saves,
onboarding and reset use one write transaction. This prevents readers from seeing
half a replacement and gives multi-statement reads a SQLite snapshot. Public
repository signatures and released migrations are unchanged.

Expo's `withTransactionAsync` operates on the shared connection, so its callback
alone does not isolate unrelated async queries. The queue provides sole ownership
of that connection while using this web-compatible API. Native
`withExclusiveTransactionAsync` instead opens another connection and requires SQL
on the provided transaction object; it is unsupported on web. Using the existing
configured connection on both platforms also preserves its foreign-key settings.
See the [Expo transaction documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/#executing-queries-within-an-async-transaction).

Do not bypass the repository with raw runtime SQL or open another wrapper that
shares its underlying Expo connection. Independent connections rely on SQLite's
locking/snapshot semantics and may return busy errors; the queue does not coordinate
other processes, tabs or connections. Initialization still finishes before any
runtime consumers mount.

## Read validation

`src/database/validation.ts` validates stored settings and read boundaries with
Zod. Invalid settings receive conservative defaults (cycle 28 days, period 5 days,
theme system, language system, goal track, booleans false). Databases created
before the `language` key existed read it as system, so no migration is needed.

Invalid calendar dates are omitted from domain and UI reads; invalid flow becomes
none, invalid mood and scales become null. Stored records are not overwritten on
reads. Unknown nonempty symptom codes are preserved.

Query failures remain errors, not absent rows. The day form mounts only after a
successful read (including a confirmed absent day); read/refetch errors remove the
form and expose a translated retry action. Settings read errors also block the
startup redirect instead of sending an existing installation to onboarding.

## Tests

Tests use Node's real in-memory SQLite (`node:sqlite`) through a small
Expo-interface adapter in `src/database/testing/`. `schema.test.ts` and
`repository.test.ts` verify SQL, upgrade preservation, rollback, version handling
and cascading relationships. `repository.interleaving.test.ts` pauses real SQL
operations to verify concurrent writes, rollback isolation and entry/symptom
snapshots. `read-errors.test.tsx` renders the real screens, React Query hooks and
forms over SQLite, mocking only platform surfaces and injecting read failures.
It checks unchanged stored values, blocked editing, retry and settings redirects.
The test-only React renderer matches the app's React version. These tests do not
replace testing the native Expo and web WASM adapters on real platforms.
