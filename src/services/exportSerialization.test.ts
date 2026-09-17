import { describe, expect, it } from 'vitest';
import { entriesToCsv, entriesToJson } from './exportSerialization';
import { parseSettings } from '@/database/validation';
import type { DailyEntry } from '@/domain/models';
const entry: DailyEntry = {
  date: '2026-01-01',
  flow: 'light',
  mood: null,
  pain: 0,
  energy: null,
  sleepHours: 7.5,
  sleepQuality: null,
  notes: '',
  updatedAt: '2026-01-01T10:00:00.000Z',
  symptoms: [{ id: 'synthetic', date: '2026-01-01', code: 'cramps', intensity: 2 }],
};
describe('export serialization', () => {
  it('serializes versioned JSON with recorded data and only basic settings', () => {
    const data = JSON.parse(
      entriesToJson([entry], parseSettings({}), new Date('2026-01-02T00:00:00Z')),
    );
    expect(data).toEqual({
      format: 'cykla-export',
      version: 1,
      exportedAt: '2026-01-02T00:00:00.000Z',
      notice: expect.any(String),
      settings: { goal: 'track', typicalCycleLength: 28, typicalPeriodLength: 5 },
      entries: [entry],
    });
    expect(JSON.parse(entriesToJson([], parseSettings({}))).entries).toEqual([]);
  });
  it('writes the documented CSV columns, nulls, zero and symptoms', () => {
    expect(entriesToCsv([entry]).split('\n')).toEqual([
      '"Datum","Blutung","Stimmung","Schmerz_0_bis_10","Energie_1_bis_5","Schlaf_Stunden","Schlafqualitaet_1_bis_5","Symptome","Notizen"',
      '"2026-01-01","light","","0","","7.5","","cramps",""',
    ]);
    expect(entriesToCsv([]).split('\n')).toHaveLength(1);
  });
  it('preserves Unicode, commas, quotes and embedded CRLF', () => {
    const notes = 'Äpfel, Grüße "ja"\r\nzweite Zeile 🌙';
    expect(entriesToCsv([{ ...entry, notes }])).toContain(
      '"Äpfel, Grüße ""ja""\r\nzweite Zeile 🌙"',
    );
    expect(
      JSON.parse(entriesToJson([{ ...entry, notes }], parseSettings({}))).entries[0].notes,
    ).toBe(notes);
  });
  it.each([
    '=1+1',
    '+SUM(A1)',
    '-1+2',
    '@SUM(A1)',
    '\t=1',
    '\r=1',
    '\n=1',
    '  =1',
    '\u0000=1',
    '\tplain',
  ])('neutralizes spreadsheet payload %j', (notes) => {
    expect(entriesToCsv([{ ...entry, notes }])).toContain(`"'${notes}"`);
  });
  it('also protects symptom codes and does not alter ordinary notes', () => {
    expect(
      entriesToCsv([
        { ...entry, notes: 'normal - text', symptoms: [{ ...entry.symptoms[0]!, code: '=1' }] },
      ]),
    ).toContain('"\'=1","normal - text"');
  });
});
