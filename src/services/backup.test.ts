import { describe, expect, it } from 'vitest';
import { parseSettings } from '@/database/validation';
import type { DailyEntry } from '@/domain/models';
import { BackupError, MAX_BACKUP_BYTES, parseBackup } from './backup';
import { entriesToJson } from './exportSerialization';

// Synthetic data only.
const entry: DailyEntry = {
  date: '2026-01-01',
  flow: 'medium',
  mood: 'calm',
  pain: 3,
  energy: null,
  sleepHours: 7.5,
  sleepQuality: null,
  notes: 'Synthetisch',
  updatedAt: '2026-01-01T10:00:00.000Z',
  symptoms: [{ id: 'synthetic-1', date: '2026-01-01', code: 'cramps', intensity: 2 }],
};
const settings = parseSettings({ goal: 'conceive', typical_cycle_length: '30' });
const v2 = () => JSON.parse(entriesToJson([entry], settings, ['2026-01-01']));
const codeOf = (content: string) => {
  try {
    parseBackup(content);
  } catch (error) {
    return error instanceof BackupError ? error.code : 'other';
  }
  return 'none';
};

describe('backup parsing', () => {
  it('round-trips the current export format', () => {
    expect(parseBackup(entriesToJson([entry], settings, ['2026-01-01']))).toEqual({
      version: 2,
      settings: { goal: 'conceive', typicalCycleLength: 30, typicalPeriodLength: 5 },
      entries: [entry],
      excludedCycleStarts: ['2026-01-01'],
    });
  });

  it('accepts version 1 files without exclusions', () => {
    const { excludedCycleStarts: _, ...legacy } = { ...v2(), version: 1 };
    expect(parseBackup(JSON.stringify(legacy))).toMatchObject({
      version: 1,
      entries: [entry],
      excludedCycleStarts: [],
    });
  });

  it('rejects files that are too large or not JSON', () => {
    expect(codeOf(' '.repeat(MAX_BACKUP_BYTES + 1))).toBe('tooLarge');
    expect(codeOf('{not json')).toBe('invalidJson');
  });

  it.each([
    ['another format', { format: 'other' }],
    ['an unknown version', { version: 3 }],
    ['version 2 without exclusions', { excludedCycleStarts: undefined }],
    ['an impossible date', { entries: [{ ...entry, date: '2026-02-30', symptoms: [] }] }],
    ['an unknown flow', { entries: [{ ...entry, flow: 'unknown' }] }],
    ['an out-of-range scale', { entries: [{ ...entry, pain: 11 }] }],
    ['an out-of-range setting', { settings: { ...settings, typicalCycleLength: 90 } }],
  ])('rejects %s', (_, override) => {
    expect(codeOf(JSON.stringify({ ...v2(), ...override }))).toBe('unsupported');
  });

  it('rejects inconsistent content', () => {
    const second = { ...entry, symptoms: [] };
    expect(codeOf(JSON.stringify({ ...v2(), entries: [entry, second] }))).toBe('duplicateDates');
    const moved = { ...entry, symptoms: [{ ...entry.symptoms[0]!, date: '2026-01-02' }] };
    expect(codeOf(JSON.stringify({ ...v2(), entries: [moved] }))).toBe('inconsistentSymptoms');
    const reused = {
      ...entry,
      date: '2026-01-02',
      symptoms: [{ ...entry.symptoms[0]!, date: '2026-01-02' }],
    };
    expect(codeOf(JSON.stringify({ ...v2(), entries: [entry, reused] }))).toBe(
      'inconsistentSymptoms',
    );
    expect(
      codeOf(JSON.stringify({ ...v2(), excludedCycleStarts: ['2026-01-01', '2026-01-01'] })),
    ).toBe('duplicateExclusions');
  });
});
