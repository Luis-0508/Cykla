import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';
import { entriesToJson } from './exportSerialization';
import { parseSettings } from '@/database/validation';
import type { DailyEntry } from '@/domain/models';

const entry: DailyEntry = {
  date: '2026-01-01',
  flow: 'light',
  mood: null,
  pain: null,
  energy: null,
  sleepHours: null,
  sleepQuality: null,
  notes: 'Synthetic backup entry',
  symptoms: [{ id: 'synthetic-id', date: '2026-01-01', code: 'cramps', intensity: 1 }],
  updatedAt: '2026-01-02T01:00:00Z',
};
const json = () =>
  entriesToJson([entry], parseSettings({}), new Date('2026-01-03'), ['2026-01-01']);

describe('backup validation', () => {
  it('reads a complete v2 export including manual exclusions', () => {
    expect(parseBackup(json())).toMatchObject({
      version: 2,
      entries: [entry],
      excludedCycleStarts: ['2026-01-01'],
    });
  });
  it('accepts legacy v1 exports but reports no unavailable exclusions', () => {
    const old = JSON.parse(json());
    old.version = 1;
    delete old.excludedCycleStarts;
    expect(parseBackup(JSON.stringify(old)).excludedCycleStarts).toEqual([]);
  });
  it('rejects duplicate days, misplaced symptoms, invalid dates and oversized files', () => {
    const duplicate = JSON.parse(json());
    duplicate.entries.push({ ...entry });
    expect(() => parseBackup(JSON.stringify(duplicate))).toThrow('doppelte Kalendertage');
    const symptomDate = JSON.parse(json());
    symptomDate.entries[0].symptoms[0].date = '2026-01-02';
    expect(() => parseBackup(JSON.stringify(symptomDate))).toThrow('Symptomdaten');
    const invalid = JSON.parse(json());
    invalid.entries[0].date = '2026-02-30';
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow('unterstützter Cykla-Export');
    expect(() => parseBackup(' '.repeat(10 * 1024 * 1024 + 1))).toThrow('zu groß');
  });
  it('rejects a v2 backup missing exclusions before touching storage', () => {
    const invalid = JSON.parse(json());
    delete invalid.excludedCycleStarts;
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
  });
});
