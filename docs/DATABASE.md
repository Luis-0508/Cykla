# Database migrations

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
transaction statements, VACUUM or connection PRAGMAs inside migration bodies.

WAL and foreign keys are enabled on every initialization, including existing
databases. SQLiteProvider awaits initialization before consumers mount. The
web-compatible Expo transaction API is used; no other connection work may run
concurrently during initialization. No ORM or additional runtime database is used.

Tests use Node's real in-memory SQLite through a small Expo-interface adapter.
They verify SQL, upgrade preservation, rollback, version handling and cascading
relationships; they do not replace testing the native Expo and web WASM adapters.

`validation.ts` validates stored settings and read boundaries with Zod. Invalid
settings receive conservative defaults (cycle 28 days, period 5 days, theme system,
language system, goal track, booleans false). Databases created before the
`language` key existed read it as system, so no migration is needed. Invalid calendar dates are omitted from domain/UI
reads; invalid flow becomes none, invalid mood/scales become null. Stored records
are not overwritten on reads. Unknown nonempty symptom codes are preserved.
