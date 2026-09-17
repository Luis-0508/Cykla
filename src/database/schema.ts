import type { SQLiteDatabase } from 'expo-sqlite';
import { v1 } from './migrations/v1';

export type Migration = { version: number; up: (db: SQLiteDatabase) => Promise<void> };
export const migrations: readonly Migration[] = [v1];

// SQLiteProvider awaits initialization before consumers mount. Keep connection
// work awaited: Expo's web-compatible transaction is not exclusive.
export async function initializeDatabase(
  db: SQLiteDatabase,
  steps: readonly Migration[] = migrations,
): Promise<void> {
  steps.forEach((step, index) => {
    if (step.version !== index + 1)
      throw new Error('Migrations must be consecutive from version 1');
  });
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = result?.user_version ?? 0;
  if (current > steps.length) throw new Error('Database requires a newer app version');
  // Connection settings also apply to existing databases, outside transactions.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  for (const step of steps.filter((migration) => migration.version > current)) {
    await db.withTransactionAsync(async () => {
      await step.up(db);
      await db.execAsync(`PRAGMA user_version = ${step.version}`);
    });
  }
}
