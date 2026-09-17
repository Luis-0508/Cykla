import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

// Real SQLite, adapting only Expo's async interface. No SQL behavior is mocked.
export function createTestDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const adapter = {
    async execAsync(sql: string) {
      sqlite.exec(sql);
    },
    async runAsync(sql: string, ...parameters: SQLInputValue[]) {
      return sqlite.prepare(sql).run(...parameters);
    },
    async getFirstAsync(sql: string, ...parameters: SQLInputValue[]) {
      return sqlite.prepare(sql).get(...parameters) ?? null;
    },
    async getAllAsync(sql: string, ...parameters: SQLInputValue[]) {
      return sqlite.prepare(sql).all(...parameters);
    },
    async withTransactionAsync(work: () => Promise<void>) {
      sqlite.exec('BEGIN');
      try {
        await work();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db: adapter as unknown as SQLiteDatabase, close: () => sqlite.close() };
}
