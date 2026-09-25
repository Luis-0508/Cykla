import { describe, expect, it } from 'vitest';
import {
  addDays,
  differenceInDays,
  formatDateOnly,
  parseDateOnly,
  todayDate,
} from '@/domain/dateOnly';
import { calculatePrediction, derivePeriodStarts } from '@/domain/prediction';

describe('calculatePrediction', () => {
  it('predicts regular 28-day cycles with medium confidence after three cycles', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26'],
    });
    expect(prediction?.averageCycleLength).toBe(28);
    expect(prediction?.expectedStart).toBe('2026-04-23');
    expect(prediction?.confidence).toBe('medium');
  });

  it('uses high confidence only with at least six stable complete cycles', () => {
    const starts = Array.from({ length: 7 }, (_, index) => addDays('2026-01-01', index * 28));
    const prediction = calculatePrediction({ periodDays: starts });
    expect(prediction?.completeCycleCount).toBe(6);
    expect(prediction?.confidence).toBe('high');
  });

  it('widens the window for irregular cycles', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-27', '2026-02-26', '2026-04-03'],
    });
    expect(prediction?.confidence).toBe('medium');
    expect(differenceInDays(prediction!.windowEnd, prediction!.windowStart)).toBeGreaterThan(4);
  });

  it('returns low confidence when too few complete cycles exist', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-10', '2026-02-08'],
      fallbackCycleLength: 30,
    });
    expect(prediction?.completeCycleCount).toBe(1);
    expect(prediction?.confidence).toBe('low');
  });

  it('returns no prediction when periods are missing', () => {
    expect(calculatePrediction({ periodDays: [] })).toBeNull();
  });

  it('recalculates after a historical entry changes', () => {
    const original = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26'],
    });
    const corrected = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-03-02', '2026-03-30'],
    });
    expect(corrected?.expectedStart).not.toBe(original?.expectedStart);
  });

  it('downweights an obvious outlier instead of deleting it', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-04-26', '2026-05-24'],
    });
    expect(prediction?.completeCycleCount).toBe(4);
    expect(prediction!.averageCycleLength).toBeLessThan(36);
    expect(prediction!.variationDays).toBeGreaterThan(10);
  });

  it('honors manually excluded cycles', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-04-26', '2026-05-24'],
      excludedCycleStarts: ['2026-02-26'],
    });
    expect(prediction?.averageCycleLength).toBe(28);
    expect(prediction?.completeCycleCount).toBe(3);
  });

  it('keeps one undocumented day inside an episode', () => {
    expect(derivePeriodStarts(['2026-01-01', '2026-01-03', '2026-01-29'])).toEqual([
      '2026-01-01',
      '2026-01-29',
    ]);
  });
  it('does not show day-level fertile marks for inconsistent short cycles', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-16', '2026-02-01', '2026-02-19'],
    });
    expect(prediction?.fertileWindowStart).toBeNull();
    expect(prediction?.fertileWindowEnd).toBeNull();
  });
  it('avoids a fertility highlight right after prolonged recorded bleeding', () => {
    const recentBleeding = Array.from({ length: 8 }, (_, index) => addDays('2026-03-26', index));
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-02-26', ...recentBleeding],
    });
    expect(prediction?.completeCycleCount).toBe(3);
    expect(prediction?.fertileWindowStart).toBeNull();
  });
  it('keeps the estimate for sufficiently documented stable cycles', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26'],
    });
    expect(prediction?.fertileWindowStart).not.toBeNull();
  });
  it('derives one start from contiguous documented period days', () => {
    expect(
      derivePeriodStarts(['2026-01-02', '2026-01-03', '2026-01-04', '2026-01-30', '2026-01-31']),
    ).toEqual(['2026-01-02', '2026-01-30']);
  });
});

describe('date-only calendar math', () => {
  it('crosses month and year boundaries without time conversion', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(differenceInDays('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('supports leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('rejects impossible calendar dates', () => {
    expect(() => parseDateOnly('2026-02-29')).toThrow();
  });

  it('keeps date-only values stable as UTC-backed calendar dates', () => {
    expect(formatDateOnly(parseDateOnly('2026-10-25'))).toBe('2026-10-25');
    expect(parseDateOnly('2026-10-25').toISOString()).toBe('2026-10-25T00:00:00.000Z');
  });

  it('formats a local device day without converting it to UTC first', () => {
    const localMidnight = new Date(2026, 6, 29, 0, 30);
    expect(todayDate(localMidnight)).toBe('2026-07-29');
  });
});

describe('prediction edge cases', () => {
  it('deduplicates and sorts input without mutation', () => {
    const days = ['2026-02-01', '2026-01-02', '2026-01-01', '2026-01-01'];
    const original = [...days];
    expect(derivePeriodStarts(days)).toEqual(['2026-01-01', '2026-02-01']);
    expect(days).toEqual(original);
  });
  it('uses configured fallback when every complete cycle is excluded', () => {
    const prediction = calculatePrediction({
      periodDays: ['2026-01-01', '2026-01-29'],
      excludedCycleStarts: ['2026-01-01'],
      fallbackCycleLength: 31,
      fallbackPeriodLength: 3,
    });
    expect(prediction).toMatchObject({
      completeCycleCount: 0,
      confidence: 'low',
      expectedStart: '2026-03-01',
      expectedPeriodEnd: '2026-03-03',
    });
  });
  it('ignores implausibly short and long cycle lengths', () => {
    expect(
      calculatePrediction({ periodDays: ['2026-01-01', '2026-01-10', '2026-06-01'] }),
    ).toMatchObject({ completeCycleCount: 0, averageCycleLength: 28, confidence: 'low' });
  });
  it('uses fallback for one period and keeps the expected date inside the window', () => {
    const prediction = calculatePrediction({
      periodDays: ['2028-02-01'],
      fallbackCycleLength: 28,
    })!;
    expect(prediction.expectedStart).toBe('2028-02-29');
    expect(prediction.windowStart < prediction.expectedStart).toBe(true);
    expect(prediction.windowEnd > prediction.expectedStart).toBe(true);
    expect(prediction.estimatedOvulation).toBeNull();
    expect(prediction.fertileWindowStart).toBeNull();
  });
});
