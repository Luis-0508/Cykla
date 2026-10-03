import { afterEach, describe, expect, it } from 'vitest';
import { addDays, differenceInDays, todayDate } from '@/domain/dateOnly';
import { describeDayStatus } from '@/domain/dayStatus';
import { calculatePrediction, deriveCycles, derivePeriodStarts } from '@/domain/prediction';
import { calculateCycleStats } from '@/domain/statistics';

// Five-day periods starting on each given day; synthetic data only.
function periods(...starts: string[]): string[] {
  return starts.flatMap((start) => Array.from({ length: 5 }, (_, day) => addDays(start, day)));
}

function countdown(periodDays: string[], today: string, fallbackCycleLength?: number) {
  const prediction = calculatePrediction({ periodDays, today, fallbackCycleLength });
  return describeDayStatus(today, derivePeriodStarts(periodDays), prediction);
}

describe('missed period entries', () => {
  it('keeps normal consecutive cycles unchanged', () => {
    const days = periods('2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26');
    const prediction = calculatePrediction({ periodDays: days, today: '2026-03-30' })!;
    expect(prediction.expectedStart).toBe('2026-04-23');
    expect(prediction.completeCycleCount).toBe(3);
    expect(prediction.overdue).toBe(false);
    expect(countdown(days, '2026-03-30')).toEqual({ kind: 'countdown', days: 24 });
  });

  it('does not turn one unrecorded period into a doubled cycle length', () => {
    // March was not recorded: 2026-02-26 -> 2026-04-23 looks like one 56-day cycle.
    const days = periods('2026-01-01', '2026-01-29', '2026-02-26', '2026-04-23');
    const prediction = calculatePrediction({ periodDays: days, today: '2026-04-27' })!;
    expect(prediction.averageCycleLength).toBe(28);
    expect(prediction.expectedStart).toBe('2026-05-21');
    expect(prediction.completeCycleCount).toBe(2);
    const gap = deriveCycles(derivePeriodStarts(days)).find((c) => c.startDate === '2026-02-26');
    expect(gap).toMatchObject({ lengthDays: 56, likelyMissedPeriod: true, excluded: false });
  });

  it('never shows an 80-day countdown just because one month is missing', () => {
    // Only two recorded periods 84 days apart: three usual cycles or one long cycle.
    const days = periods('2026-06-01', '2026-08-24');
    const status = countdown(days, '2026-08-28', 28);
    // The window opens one usual cycle after the last period and reaches the long reading.
    expect(status).toEqual({
      kind: 'uncertain',
      windowStart: '2026-09-14',
      windowEnd: '2026-11-23',
    });
  });

  it('handles several missed periods in one history', () => {
    const days = periods(
      '2026-01-01',
      '2026-01-29',
      '2026-03-26', // 56 days: one missing
      '2026-04-23',
      '2026-07-16', // 84 days: two missing
      '2026-08-13',
    );
    const prediction = calculatePrediction({ periodDays: days, today: '2026-08-15' })!;
    expect(prediction.averageCycleLength).toBe(28);
    expect(prediction.completeCycleCount).toBe(3);
    expect(prediction.expectedStart).toBe('2026-09-10');
  });

  it('still counts a single long cycle that cannot be two cycles', () => {
    const prediction = calculatePrediction({
      periodDays: periods('2026-01-01', '2026-02-10'),
      fallbackCycleLength: 28,
    })!;
    expect(prediction.completeCycleCount).toBe(1);
    expect(prediction.averageCycleLength).toBe(40);
  });

  it('keeps repeated long cycles but marks them uncertain without other evidence', () => {
    const prediction = calculatePrediction({
      periodDays: periods('2026-01-01', '2026-03-01', '2026-04-29', '2026-06-27'),
      fallbackCycleLength: 28,
    })!;
    expect(prediction.completeCycleCount).toBe(3);
    expect(prediction.averageCycleLength).toBe(59);
    expect(prediction.uncertainHistory).toBe(true);
    expect(prediction.confidence).toBe('low');
  });

  it('ignores manually excluded cycles when judging a gap', () => {
    const cycles = deriveCycles(
      ['2026-01-01', '2026-01-17', '2026-02-14', '2026-03-14', '2026-05-09'],
      ['2026-01-01'],
    );
    expect(cycles.map((cycle) => cycle.likelyMissedPeriod)).toEqual([
      false,
      false,
      false,
      true,
      false,
    ]);
  });

  it('keeps Trends statistics consistent with the prediction', () => {
    const days = periods('2026-01-01', '2026-01-29', '2026-02-26', '2026-04-23');
    const prediction = calculatePrediction({ periodDays: days })!;
    const stats = calculateCycleStats(deriveCycles(derivePeriodStarts(days)), []);
    expect(stats.usableCycles).toBe(prediction.completeCycleCount);
    expect(stats.averageLength).toBe(28);
    expect(stats.longest).toBe(28);
  });
});

describe('stale and overdue estimates', () => {
  const days = periods('2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26');

  it('keeps counting down while the midpoint is ahead', () => {
    expect(countdown(days, '2026-04-23')).toEqual({ kind: 'countdown', days: 0 });
  });

  it('stays inside the window after the midpoint has passed', () => {
    const prediction = calculatePrediction({ periodDays: days, today: '2026-04-25' })!;
    expect(prediction.overdue).toBe(false);
    expect(describeDayStatus('2026-04-25', derivePeriodStarts(days), prediction)).toEqual({
      kind: 'inWindow',
      windowStart: prediction.windowStart,
    });
  });

  it('marks the estimate overdue the day after the window ends, not before', () => {
    const prediction = calculatePrediction({ periodDays: days, today: '2026-04-23' })!;
    expect(calculatePrediction({ periodDays: days, today: prediction.windowEnd })!.overdue).toBe(
      false,
    );
    const late = addDays(prediction.windowEnd, 1);
    expect(calculatePrediction({ periodDays: days, today: late })!.overdue).toBe(true);
  });

  it('does not roll an old last period forward into a precise countdown', () => {
    const status = countdown(periods('2026-06-01'), '2026-10-03', 28);
    expect(status).toEqual({ kind: 'overdue', windowEnd: '2026-07-06' });
  });

  it('applies the overdue state to future selected days as well', () => {
    const prediction = calculatePrediction({ periodDays: days, today: '2026-06-01' })!;
    expect(describeDayStatus('2026-06-20', derivePeriodStarts(days), prediction).kind).toBe(
      'overdue',
    );
  });

  it('has no overdue state without a known current day', () => {
    expect(calculatePrediction({ periodDays: days })!.overdue).toBe(false);
  });

  it('says nothing about future days beyond the estimated window', () => {
    const prediction = calculatePrediction({ periodDays: days, today: '2026-04-01' })!;
    expect(describeDayStatus('2026-06-01', derivePeriodStarts(days), prediction)).toEqual({
      kind: 'beyondEstimate',
    });
  });
});

describe('selected past days', () => {
  const days = periods('2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26');
  const prediction = calculatePrediction({ periodDays: days, today: '2026-03-30' })!;
  const starts = derivePeriodStarts(days);

  it('shows the cycle day instead of counting to the current estimate', () => {
    // Previously: about 82 days from 2026-02-01 to the current midpoint.
    expect(describeDayStatus('2026-02-01', starts, prediction)).toEqual({
      kind: 'pastCycle',
      cycleDay: 4,
    });
  });

  it('has no cycle day before the first recorded period', () => {
    expect(describeDayStatus('2025-12-20', starts, prediction)).toEqual({
      kind: 'pastCycle',
      cycleDay: null,
    });
  });

  it('has nothing to show without any recorded period', () => {
    expect(describeDayStatus('2026-02-01', [], null)).toEqual({ kind: 'none' });
  });
});

describe('calendar boundaries', () => {
  it('crosses a month boundary', () => {
    const prediction = calculatePrediction({ periodDays: ['2026-01-31'], today: '2026-02-01' })!;
    expect(prediction.expectedStart).toBe('2026-02-28');
  });

  it('crosses a year boundary, including the overdue check', () => {
    const days = periods('2026-10-01', '2026-10-29', '2026-11-26', '2026-12-24');
    const prediction = calculatePrediction({ periodDays: days, today: '2026-12-30' })!;
    expect(prediction.expectedStart).toBe('2027-01-21');
    expect(prediction.windowEnd.startsWith('2027-')).toBe(true);
    expect(countdown(days, '2026-12-30')).toEqual({ kind: 'countdown', days: 22 });
    const late = addDays(prediction.windowEnd, 1);
    expect(calculatePrediction({ periodDays: days, today: late })!.overdue).toBe(true);
  });

  it('counts 29 February in leap years', () => {
    const days = periods('2028-01-15', '2028-02-12', '2028-03-11', '2028-04-08');
    const prediction = calculatePrediction({ periodDays: days })!;
    expect(differenceInDays('2028-03-11', '2028-02-12')).toBe(28);
    expect(prediction.averageCycleLength).toBe(28);
    expect(prediction.expectedStart).toBe('2028-05-06');
  });

  it('uses the fallback for insufficient history', () => {
    const prediction = calculatePrediction({
      periodDays: periods('2026-03-01'),
      fallbackCycleLength: 30,
      today: '2026-03-03',
    })!;
    expect(prediction).toMatchObject({
      expectedStart: '2026-03-31',
      completeCycleCount: 0,
      confidence: 'low',
      overdue: false,
    });
  });
});

describe('local days and time zones', () => {
  const originalTimeZone = process.env.TZ;
  afterEach(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });

  it.each(['Europe/Berlin', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Australia/Lord_Howe'])(
    'keeps date-only math independent of the time zone in %s',
    (timeZone) => {
      process.env.TZ = timeZone;
      // Spring and autumn DST changes in Europe and the US.
      expect(differenceInDays('2026-03-30', '2026-03-28')).toBe(2);
      expect(differenceInDays('2026-10-26', '2026-10-24')).toBe(2);
      expect(differenceInDays('2026-11-02', '2026-10-31')).toBe(2);
      expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
      // Local midnight and late evening stay on the device's calendar day.
      expect(todayDate(new Date(2026, 2, 29, 0, 5))).toBe('2026-03-29');
      expect(todayDate(new Date(2026, 9, 25, 23, 55))).toBe('2026-10-25');
      const days = periods('2026-02-26', '2026-03-26');
      expect(calculatePrediction({ periodDays: days, today: '2026-03-29' })!.expectedStart).toBe(
        '2026-04-23',
      );
    },
  );
});
