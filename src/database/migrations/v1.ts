import type { Migration } from '../schema';

// Original MVP schema. Never edit a released migration; append a new version.
export const v1: Migration = {
  version: 1,
  async up(db) {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_entries (
      date TEXT PRIMARY KEY NOT NULL,
      flow TEXT NOT NULL DEFAULT 'none',
      mood TEXT,
      pain INTEGER,
      energy INTEGER,
      sleep_hours REAL,
      sleep_quality INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS symptom_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      code TEXT NOT NULL,
      intensity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (date) REFERENCES daily_entries(date) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS symptom_entries_date_idx ON symptom_entries(date);

    CREATE TABLE IF NOT EXISTS cycle_exclusions (
      start_date TEXT PRIMARY KEY NOT NULL,
      reason TEXT NOT NULL DEFAULT 'manual'
    );

    `);
  },
};
