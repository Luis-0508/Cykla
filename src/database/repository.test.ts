import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './testing/sqlite';
import { initializeDatabase } from './schema';
import * as repository from './repository';
import { parseSettings } from './validation';
import type { BackupData } from '@/domain/models';

const input: repository.SaveDailyEntryInput = {
  date: '2026-01-01',
  flow: 'medium',
  mood: 'calm',
  pain: 0,
  energy: 3,
  sleepHours: 7.5,
  sleepQuality: 4,
  notes: '  Synthetisch: Ä, "Zitat"\nZeile 2  ',
  symptoms: [
    { code: 'cramps', intensity: 2 },
    { code: 'headache', intensity: 1 },
  ],
};
describe('repository with SQLite', () => {
  let test: ReturnType<typeof createTestDatabase>;
  beforeEach(async () => {
    test = createTestDatabase();
    await initializeDatabase(test.db);
  });
  afterEach(() => test.close());
  it('roundtrips and updates daily entries and replaces symptoms', async () => {
    expect(await repository.getEntry(test.db, input.date)).toBeNull();
    await repository.saveDailyEntry(test.db, input);
    const loaded = await repository.getEntry(test.db, input.date);
    expect(loaded).toMatchObject({ ...input, notes: input.notes.trim() });
    expect(loaded?.updatedAt).toMatch(/^\d{4}-/);
    expect(new Set(loaded?.symptoms.map((symptom) => symptom.id)).size).toBe(2);
    await repository.saveDailyEntry(test.db, { ...input, flow: 'none', symptoms: [] });
    expect(await repository.getAllEntries(test.db)).toMatchObject([{ flow: 'none', symptoms: [] }]);
  });
  it('loads chronological entries and associates symptoms with the right date', async () => {
    await repository.saveDailyEntry(test.db, { ...input, date: '2026-02-01', symptoms: [] });
    await repository.saveDailyEntry(test.db, input);
    const entries = await repository.getAllEntries(test.db);
    expect(entries.map((entry) => entry.date)).toEqual(['2026-01-01', '2026-02-01']);
    expect(entries.map((entry) => entry.symptoms.length)).toEqual([2, 0]);
  });
  it('cascades symptom deletion and keeps other entries', async () => {
    await repository.saveDailyEntry(test.db, input);
    await repository.saveDailyEntry(test.db, { ...input, date: '2026-02-01' });
    await repository.deleteDailyEntry(test.db, input.date);
    expect(await repository.getEntry(test.db, input.date)).toBeNull();
    expect(await test.db.getAllAsync('SELECT date FROM symptom_entries')).toEqual([
      { date: '2026-02-01' },
      { date: '2026-02-01' },
    ]);
  });
  it('rolls back the entry and symptom replacement if insertion fails', async () => {
    await repository.saveDailyEntry(test.db, input);
    await test.db.execAsync(
      "CREATE TRIGGER reject_symptom BEFORE INSERT ON symptom_entries BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END",
    );
    await expect(
      repository.saveDailyEntry(test.db, { ...input, notes: 'changed' }),
    ).rejects.toThrow();
    expect((await repository.getEntry(test.db, input.date))?.notes).toBe(input.notes.trim());
    expect((await repository.getEntry(test.db, input.date))?.symptoms).toHaveLength(2);
  });
  it('toggles exclusions idempotently and deletes all four tables but keeps schema', async () => {
    await repository.saveDailyEntry(test.db, input);
    await repository.setSetting(test.db, 'goal', 'conceive');
    await repository.toggleCycleExclusion(test.db, input.date, true);
    await repository.toggleCycleExclusion(test.db, input.date, true);
    expect(await repository.getExcludedCycleStarts(test.db)).toEqual([input.date]);
    await repository.toggleCycleExclusion(test.db, input.date, false);
    expect(await repository.getExcludedCycleStarts(test.db)).toEqual([]);
    await repository.toggleCycleExclusion(test.db, input.date, true);
    await repository.deleteAllLocalData(test.db);
    for (const table of ['daily_entries', 'symptom_entries', 'cycle_exclusions', 'app_settings']) {
      expect(await test.db.getAllAsync(`SELECT * FROM ${table}`)).toEqual([]);
    }
    expect(await repository.getSettings(test.db)).toEqual(parseSettings({}));
    expect(await test.db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 1 });
    await repository.saveDailyEntry(test.db, input);
  });
  it('completes onboarding over a year boundary and persists settings', async () => {
    await repository.completeOnboarding(test.db, {
      goal: 'conceive',
      lastPeriodDate: '2025-12-30',
      typicalCycleLength: 30,
      typicalPeriodLength: 3,
    });
    expect((await repository.getAllEntries(test.db)).map((entry) => entry.date)).toEqual([
      '2025-12-30',
    ]);
    expect(await repository.getSettings(test.db)).toMatchObject({
      onboardingCompleted: true,
      goal: 'conceive',
      typicalCycleLength: 30,
      typicalPeriodLength: 3,
    });
    await repository.setSetting(test.db, 'theme', 'dark');
    await repository.setSetting(test.db, 'theme', 'light');
    expect((await repository.getSettings(test.db)).theme).toBe('light');
  });
  it('restores a validated backup including symptoms and excluded cycles', async () => {
    await repository.saveDailyEntry(test.db, input);
    await repository.setSetting(test.db, 'theme', 'dark');
    await repository.setSetting(test.db, 'dailyReminderEnabled', true);
    const backup: BackupData = {
      version: 2,
      entries: [{ ...(await repository.getEntry(test.db, input.date))!, date: '2026-02-01' }],
      settings: { goal: 'conceive', typicalCycleLength: 30, typicalPeriodLength: 4 },
      excludedCycleStarts: ['2026-02-01'],
    };
    backup.entries[0]!.symptoms = backup.entries[0]!.symptoms.map((symptom) => ({
      ...symptom,
      date: '2026-02-01',
    }));
    await repository.restoreBackup(test.db, backup);
    expect((await repository.getAllEntries(test.db)).map((entry) => entry.date)).toEqual([
      '2026-02-01',
    ]);
    expect((await repository.getEntry(test.db, '2026-02-01'))?.symptoms).toHaveLength(2);
    expect(await repository.getExcludedCycleStarts(test.db)).toEqual(['2026-02-01']);
    expect(await repository.getSettings(test.db)).toMatchObject({
      goal: 'conceive',
      typicalCycleLength: 30,
      typicalPeriodLength: 4,
      dailyReminderEnabled: true,
      theme: 'dark',
    });
  });
  it('rolls back the entire replacement if a backup insert fails', async () => {
    await repository.saveDailyEntry(test.db, input);
    await repository.toggleCycleExclusion(test.db, input.date, true);
    await repository.setSetting(test.db, 'goal', 'track');
    const entry = (await repository.getEntry(test.db, input.date))!;
    const backup: BackupData = {
      version: 2,
      entries: [{ ...entry, date: '2026-03-02', symptoms: [] }],
      settings: { goal: 'conceive', typicalCycleLength: 31, typicalPeriodLength: 4 },
      excludedCycleStarts: [],
    };
    await test.db.execAsync(
      "CREATE TRIGGER reject_restored_entry BEFORE INSERT ON daily_entries WHEN NEW.date = '2026-03-02' BEGIN SELECT RAISE(ABORT, 'synthetic restore failure'); END",
    );
    await expect(repository.restoreBackup(test.db, backup)).rejects.toThrow();
    expect((await repository.getAllEntries(test.db)).map((item) => item.date)).toEqual([
      input.date,
    ]);
    expect(await repository.getExcludedCycleStarts(test.db)).toEqual([input.date]);
    expect((await repository.getSettings(test.db)).goal).toBe('track');
  });

  it('contains damaged dates/enums/scales without overwriting stored values', async () => {
    await repository.saveDailyEntry(test.db, input);
    await test.db.execAsync(
      "UPDATE daily_entries SET flow='future', mood='broken', pain=999; UPDATE symptom_entries SET intensity=999;",
    );
    expect(await repository.getEntry(test.db, input.date)).toMatchObject({
      flow: 'none',
      mood: null,
      pain: null,
      symptoms: [{ intensity: 1 }, { intensity: 1 }],
    });
    expect(await test.db.getFirstAsync('SELECT flow FROM daily_entries')).toEqual({
      flow: 'future',
    });
    await test.db.runAsync(
      "INSERT INTO daily_entries (date, updated_at) VALUES ('2026-02-30', '')",
    );
    expect(await repository.getEntry(test.db, '2026-02-30')).toBeNull();
    expect(await repository.getAllEntries(test.db)).toHaveLength(1);
  });
});

describe('stored settings boundaries', () => {
  it('accepts valid values', () => {
    expect(
      parseSettings({
        goal: 'unsure',
        theme: 'dark',
        typical_cycle_length: '60',
        typical_period_length: '10',
        onboarding_completed: 'true',
        daily_reminder_enabled: 'true',
      }),
    ).toEqual({
      goal: 'unsure',
      theme: 'dark',
      typicalCycleLength: 60,
      typicalPeriodLength: 10,
      onboardingCompleted: true,
      dailyReminderEnabled: true,
    });
  });
  it.each(['', 'NaN', 'Infinity', '-1', '0', '999', '28.5', '0x20', ' 28 ', null, undefined])(
    'falls back for invalid lengths: %s',
    (value) => {
      expect(
        parseSettings({ typical_cycle_length: value, typical_period_length: value }),
      ).toMatchObject({ typicalCycleLength: 28, typicalPeriodLength: 5 });
    },
  );
  it('falls back for unknown enums and non-literal booleans', () => {
    expect(
      parseSettings({
        goal: 'future',
        theme: 'blue',
        onboarding_completed: '1',
        daily_reminder_enabled: 'TRUE',
      }),
    ).toEqual(parseSettings({}));
  });
});
