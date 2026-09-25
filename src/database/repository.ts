import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings, BackupData, DailyEntry, Goal, SymptomEntry } from '@/domain/models';

import {
  dailyRowSchema,
  dateSchema,
  parseSettings,
  SETTINGS_KEYS,
  symptomRowSchema,
} from './validation';

function toEntry(value: unknown, symptoms: SymptomEntry[]): DailyEntry | null {
  const parsed = dailyRowSchema.safeParse(value);
  if (!parsed.success) return null;
  const row = parsed.data;
  return {
    date: row.date,
    flow: row.flow,
    mood: row.mood,
    pain: row.pain,
    energy: row.energy,
    sleepHours: row.sleep_hours,
    sleepQuality: row.sleep_quality,
    notes: row.notes,
    symptoms,
    updatedAt: row.updated_at,
  };
}
function parseSymptoms(rows: unknown[]): SymptomEntry[] {
  return rows.flatMap((row) => {
    const parsed = symptomRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings',
  );
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return parseSettings(values);
}

export async function setSetting(
  db: SQLiteDatabase,
  key: keyof typeof SETTINGS_KEYS,
  value: string | number | boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTINGS_KEYS[key],
    String(value),
  );
}

export type OnboardingInput = {
  goal: Goal;
  lastPeriodDate: string;
  typicalCycleLength: number;
  typicalPeriodLength: number;
};

export async function completeOnboarding(
  db: SQLiteDatabase,
  input: OnboardingInput,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await setSetting(db, 'goal', input.goal);
    await setSetting(db, 'typicalCycleLength', input.typicalCycleLength);
    await setSetting(db, 'typicalPeriodLength', input.typicalPeriodLength);
    await setSetting(db, 'onboardingCompleted', true);

    // Only the confirmed start is observed; typical duration does not
    // authorize creating additional recorded bleeding days, including future days.
    await db.runAsync(
      `INSERT INTO daily_entries
        (date, flow, mood, pain, energy, sleep_hours, sleep_quality, notes, updated_at)
       VALUES (?, 'medium', NULL, NULL, NULL, NULL, NULL, '', ?)
       ON CONFLICT(date) DO NOTHING`,
      input.lastPeriodDate,
      new Date().toISOString(),
    );
  });
}

export async function getAllEntries(db: SQLiteDatabase): Promise<DailyEntry[]> {
  const rows = await db.getAllAsync<unknown>('SELECT * FROM daily_entries ORDER BY date ASC');
  const symptomRows = await db.getAllAsync<unknown>(
    'SELECT * FROM symptom_entries ORDER BY date ASC, code ASC',
  );
  const symptomsByDate = new Map<string, SymptomEntry[]>();
  parseSymptoms(symptomRows).forEach((row) => {
    const list = symptomsByDate.get(row.date) ?? [];
    list.push(row);
    symptomsByDate.set(row.date, list);
  });
  return rows.flatMap((row) => {
    const parsed = dailyRowSchema.safeParse(row);
    if (!parsed.success) return [];
    const entry = toEntry(parsed.data, symptomsByDate.get(parsed.data.date) ?? []);
    return entry ? [entry] : [];
  });
}

export async function getEntry(db: SQLiteDatabase, date: string): Promise<DailyEntry | null> {
  const row = await db.getFirstAsync<unknown>('SELECT * FROM daily_entries WHERE date = ?', date);
  if (!row) return null;
  const symptoms = await db.getAllAsync<unknown>(
    'SELECT * FROM symptom_entries WHERE date = ? ORDER BY code ASC',
    date,
  );
  return toEntry(row, parseSymptoms(symptoms));
}

export type SaveDailyEntryInput = Omit<DailyEntry, 'updatedAt' | 'symptoms'> & {
  symptoms: { code: string; intensity: number }[];
};

export async function saveDailyEntry(
  db: SQLiteDatabase,
  input: SaveDailyEntryInput,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO daily_entries
        (date, flow, mood, pain, energy, sleep_hours, sleep_quality, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
        flow = excluded.flow,
        mood = excluded.mood,
        pain = excluded.pain,
        energy = excluded.energy,
        sleep_hours = excluded.sleep_hours,
        sleep_quality = excluded.sleep_quality,
        notes = excluded.notes,
        updated_at = excluded.updated_at`,
      input.date,
      input.flow,
      input.mood,
      input.pain,
      input.energy,
      input.sleepHours,
      input.sleepQuality,
      input.notes.trim(),
      new Date().toISOString(),
    );
    await db.runAsync('DELETE FROM symptom_entries WHERE date = ?', input.date);
    for (const symptom of input.symptoms) {
      await db.runAsync(
        'INSERT INTO symptom_entries (id, date, code, intensity) VALUES (?, ?, ?, ?)',
        createId(),
        input.date,
        symptom.code,
        symptom.intensity,
      );
    }
  });
}

export async function deleteDailyEntry(db: SQLiteDatabase, date: string): Promise<void> {
  await db.runAsync('DELETE FROM daily_entries WHERE date = ?', date);
}

export async function getExcludedCycleStarts(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ start_date: string }>(
    'SELECT start_date FROM cycle_exclusions ORDER BY start_date ASC',
  );
  return rows.map((row) => row.start_date).filter((date) => dateSchema.safeParse(date).success);
}

export async function toggleCycleExclusion(
  db: SQLiteDatabase,
  startDate: string,
  excluded: boolean,
): Promise<void> {
  if (excluded) {
    await db.runAsync(
      'INSERT OR REPLACE INTO cycle_exclusions (start_date, reason) VALUES (?, ?)',
      startDate,
      'manual',
    );
  } else {
    await db.runAsync('DELETE FROM cycle_exclusions WHERE start_date = ?', startDate);
  }
}

export async function deleteAllLocalData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM symptom_entries');
    await db.runAsync('DELETE FROM daily_entries');
    await db.runAsync('DELETE FROM cycle_exclusions');
    await db.runAsync('DELETE FROM app_settings');
  });
}

/**
 * Restore a previously validated backup atomically. If any write fails, SQLite
 * rolls back both the deletion and all partial imports, preserving old data.
 * Device-local reminder and biometric preferences are deliberately not restored.
 */
export async function restoreBackup(db: SQLiteDatabase, backup: BackupData): Promise<void> {
  await db.withTransactionAsync(async () => {
    const deviceSettings = await getSettings(db);
    await db.runAsync('DELETE FROM symptom_entries');
    await db.runAsync('DELETE FROM daily_entries');
    await db.runAsync('DELETE FROM cycle_exclusions');
    await db.runAsync('DELETE FROM app_settings');

    await setSetting(db, 'onboardingCompleted', true);
    await setSetting(db, 'goal', backup.settings.goal);
    await setSetting(db, 'typicalCycleLength', backup.settings.typicalCycleLength);
    await setSetting(db, 'typicalPeriodLength', backup.settings.typicalPeriodLength);
    // Device preferences remain aligned with the existing OS reminder and UI state.
    await setSetting(db, 'theme', deviceSettings.theme);
    await setSetting(db, 'dailyReminderEnabled', deviceSettings.dailyReminderEnabled);

    for (const entry of backup.entries) {
      await db.runAsync(
        `INSERT INTO daily_entries
           (date, flow, mood, pain, energy, sleep_hours, sleep_quality, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.date,
        entry.flow,
        entry.mood,
        entry.pain,
        entry.energy,
        entry.sleepHours,
        entry.sleepQuality,
        entry.notes,
        entry.updatedAt,
      );
      for (const symptom of entry.symptoms) {
        await db.runAsync(
          'INSERT INTO symptom_entries (id, date, code, intensity) VALUES (?, ?, ?, ?)',
          symptom.id,
          symptom.date,
          symptom.code,
          symptom.intensity,
        );
      }
    }
    for (const start of backup.excludedCycleStarts) {
      await db.runAsync(
        "INSERT INTO cycle_exclusions (start_date, reason) VALUES (?, 'manual')",
        start,
      );
    }
  });
}
