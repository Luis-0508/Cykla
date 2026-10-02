import { describe, expect, it } from 'vitest';
import { calculateCycleStats } from './statistics';
import { deriveCycles } from './prediction';
import type { DailyEntry } from './models';
describe('cycle statistics', () => {
  it('returns unknown lengths instead of zero for empty data', () => {
    expect(calculateCycleStats([], [])).toEqual({
      usableCycles: 0,
      averageLength: null,
      shortest: null,
      longest: null,
      documentedDays: 0,
      symptomDays: 0,
    });
  });
  it('excludes manual and incomplete cycles and rounds the average', () => {
    const cycles = deriveCycles(
      ['2026-01-01', '2026-01-29', '2026-02-28', '2026-04-29'],
      ['2026-02-28'],
    );
    expect(calculateCycleStats(cycles, [])).toMatchObject({
      usableCycles: 2,
      averageLength: 29,
      shortest: 28,
      longest: 30,
    });
  });
  it('uses the same 15–90 day cycle lengths as predictions', () => {
    const cycles = deriveCycles(['2026-01-01', '2026-01-11', '2026-02-08', '2026-06-01']);
    expect(calculateCycleStats(cycles, [])).toMatchObject({
      usableCycles: 1,
      averageLength: 28,
      shortest: 28,
      longest: 28,
    });
  });
  it('counts symptom days rather than individual symptoms', () => {
    const base: DailyEntry = {
      date: '2026-01-01',
      flow: 'none',
      mood: null,
      pain: null,
      energy: null,
      sleepHours: null,
      sleepQuality: null,
      notes: '',
      updatedAt: '',
      symptoms: [],
    };
    const symptomatic = {
      ...base,
      date: '2026-01-02',
      symptoms: ['cramps', 'headache'].map((code) => ({
        id: code,
        date: '2026-01-02',
        code,
        intensity: 1,
      })),
    };
    expect(calculateCycleStats([], [base, symptomatic])).toMatchObject({
      documentedDays: 2,
      symptomDays: 1,
    });
  });
});
