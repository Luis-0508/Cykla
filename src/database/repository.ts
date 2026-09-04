import type { SQLiteDatabase } from 'expo-sqlite';
import { addDays } from '@/domain/dateOnly';
import type {
  AppSettings,
  DailyEntry,
  FlowIntensity,
  Goal,
  Mood,
  SymptomEntry,
} from '@/domain/models';

type DailyRow = {
  date: string;
  flow: FlowIntensity;
  mood: Mood | null;
  pain: number | null;
  energy: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  notes: string;
  updated_at: string;
};

type SymptomRow = {
  id: string;
  date: string;
  code: string;
  intensity: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  onboardingCompleted: false,
  goal: 'track',
  typicalCycleLength: 28,
  typicalPeriodLength: 5,
  theme: 'system',
  dailyReminderEnabled: false,
};

const SETTINGS_KEYS = {
  onboardingCompleted: 'onboarding_completed',
  goal: 'goal',
  typicalCycleLength: 'typical_cycle_length',
  typicalPeriodLength: 'typical_period_length',
  theme: 'theme',
  dailyReminderEnabled: 'daily_reminder_enabled',
} as const;

function toEntry(row: DailyRow, symptoms: SymptomEntry[]): DailyEntry {
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

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings',
  );
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    onboardingCompleted: values[SETTINGS_KEYS.onboardingCompleted] === 'true',
    goal: (values[SETTINGS_KEYS.goal] as Goal | undefined) ?? DEFAULT_SETTINGS.goal,
    typicalCycleLength: Number(
      values[SETTINGS_KEYS.typicalCycleLength] ?? DEFAULT_SETTINGS.typicalCycleLength,
    ),
    typicalPeriodLength: Number(
      values[SETTINGS_KEYS.typicalPeriodLength] ?? DEFAULT_SETTINGS.typicalPeriodLength,
    ),
    theme:
      (values[SETTINGS_KEYS.theme] as AppSettings['theme'] | undefined) ?? DEFAULT_SETTINGS.theme,
    dailyReminderEnabled: values[SETTINGS_KEYS.dailyReminderEnabled] === 'true',
  };
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

    for (let index = 0; index < input.typicalPeriodLength; index += 1) {
      const date = addDays(input.lastPeriodDate, index);
      await db.runAsync(
        `INSERT INTO daily_entries
          (date, flow, mood, pain, energy, sleep_hours, sleep_quality, notes, updated_at)
         VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, '', ?)
         ON CONFLICT(date) DO UPDATE SET flow = excluded.flow, updated_at = excluded.updated_at`,
        date,
        index === 0 ? 'medium' : 'light',
        new Date().toISOString(),
      );
    }
  });
}

export async function getAllEntries(db: SQLiteDatabase): Promise<DailyEntry[]> {
  const rows = await db.getAllAsync<DailyRow>('SELECT * FROM daily_entries ORDER BY date ASC');
  const symptomRows = await db.getAllAsync<SymptomRow>(
    'SELECT * FROM symptom_entries ORDER BY date ASC, code ASC',
  );
  const symptomsByDate = new Map<string, SymptomEntry[]>();
  symptomRows.forEach((row) => {
    const list = symptomsByDate.get(row.date) ?? [];
    list.push(row);
    symptomsByDate.set(row.date, list);
  });
  return rows.map((row) => toEntry(row, symptomsByDate.get(row.date) ?? []));
}

export async function getEntry(db: SQLiteDatabase, date: string): Promise<DailyEntry | null> {
  const row = await db.getFirstAsync<DailyRow>('SELECT * FROM daily_entries WHERE date = ?', date);
  if (!row) return null;
  const symptoms = await db.getAllAsync<SymptomRow>(
    'SELECT * FROM symptom_entries WHERE date = ? ORDER BY code ASC',
    date,
  );
  return toEntry(row, symptoms);
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
  return rows.map((row) => row.start_date);
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
