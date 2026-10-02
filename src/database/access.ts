import type { SQLiteDatabase } from 'expo-sqlite';

// Expo's web-compatible transactions own the connection, not the async callback.
// Every repository operation must therefore hold this connection until it ends.
const pending = new WeakMap<SQLiteDatabase, Promise<void>>();

export function withDatabaseAccess<T>(db: SQLiteDatabase, work: () => Promise<T>): Promise<T> {
  const result = (pending.get(db) ?? Promise.resolve()).then(work);
  // A rejected operation must not prevent the next operation from running.
  pending.set(
    db,
    result.then(
      () => undefined,
      () => undefined,
    ),
  );
  return result;
}

export function withDatabaseTransaction<T>(db: SQLiteDatabase, work: () => Promise<T>): Promise<T> {
  return withDatabaseAccess(db, async () => {
    let result!: T;
    await db.withTransactionAsync(async () => {
      result = await work();
    });
    return result;
  });
}
