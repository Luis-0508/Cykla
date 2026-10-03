import { describe, expect, it } from 'vitest';
import { addDays, differenceInDays, eachDay } from '@/domain/dateOnly';
import { describeDayStatus } from '@/domain/dayStatus';
import {
  calculatePrediction,
  deriveCycles,
  derivePeriodStarts,
  observedDaysWithoutBleeding,
} from '@/domain/prediction';
import { calculateCycleStats } from '@/domain/statistics';

// Synthetic five-day periods; each start follows the previous one by the given length.
function history(lengths: number[], first = '2026-01-01') {
  const starts = lengths.reduce((all, length) => [...all, addDays(all.at(-1)!, length)], [first]);
  const periodDays = starts.flatMap((start) =>
    Array.from({ length: 5 }, (_, day) => addDays(start, day)),
  );
  return { starts, periodDays, last: starts.at(-1)! };
}

// Every non-bleeding day between the first and the last start, as if logged daily.
function loggedDaily(periodDays: string[]) {
  const bleeding = new Set(periodDays);
  return eachDay(periodDays[0]!, periodDays.at(-1)!).filter((day) => !bleeding.has(day));
}

function classify(lengths: number[], options: { typical?: number; observed?: boolean } = {}) {
  const { starts, periodDays } = history(lengths);
  return deriveCycles(starts, [], {
    fallbackCycleLength: options.typical,
    observedDays: options.observed ? loggedDaily(periodDays) : [],
  })
    .filter((cycle) => cycle.lengthDays !== null)
    .map((cycle) =>
      cycle.likelyMissedPeriod ? 'missed' : cycle.possibleMissedPeriod ? 'possible' : 'counted',
    );
}

function predict(lengths: number[], options: { typical?: number; observed?: boolean } = {}) {
  const { periodDays, last } = history(lengths);
  const prediction = calculatePrediction({
    periodDays,
    fallbackCycleLength: options.typical,
    observedDays: options.observed ? loggedDaily(periodDays) : [],
  })!;
  return {
    prediction,
    opensAfter: differenceInDays(prediction.windowStart, last),
    closesAfter: differenceInDays(prediction.windowEnd, last),
  };
}

describe('gaps of about a multiple of the usual length', () => {
  it('treats 28, 56, 28 as one missed entry', () => {
    expect(classify([28, 56, 28])).toEqual(['counted', 'missed', 'counted']);
    const { prediction, opensAfter } = predict([28, 56, 28]);
    expect(prediction).toMatchObject({ averageCycleLength: 28, uncertainHistory: false });
    expect(opensAfter).toBe(23);
  });

  it('does not learn a precise 56-day cycle from 56, 56', () => {
    // Two long cycles support each other: equally likely long cycles or missed entries.
    expect(classify([56, 56])).toEqual(['possible', 'possible']);
    const { prediction, opensAfter, closesAfter } = predict([56, 56]);
    expect(prediction).toMatchObject({ uncertainHistory: true, confidence: 'low' });
    expect(prediction.fertileWindowStart).toBeNull();
    // Opens one usual cycle after the last start and also covers the long reading.
    expect(opensAfter).toBe(28 - 7);
    expect(closesAfter).toBe(56 + 7);
  });

  it('does not learn a precise 84-day cycle from 84, 84', () => {
    expect(classify([84, 84])).toEqual(['possible', 'possible']);
    const { prediction, opensAfter, closesAfter } = predict([84, 84]);
    expect(prediction.uncertainHistory).toBe(true);
    expect(opensAfter).toBe(21);
    expect(closesAfter).toBe(91);
  });

  it('keeps two gaps from vouching for each other (28, 56, 56)', () => {
    // Before: each 56 was compared with median(28, 56) = 42 and counted as a real cycle.
    expect(classify([28, 56, 56])).toEqual(['counted', 'possible', 'possible']);
    const { prediction, opensAfter } = predict([28, 56, 56]);
    expect(prediction).toMatchObject({ uncertainHistory: true, confidence: 'low' });
    // The margin comes from the 28-day cycle, so the window cannot open inside the period.
    expect(opensAfter).toBe(28 - 5);
  });

  it('classifies all gaps of a mixed history the same way, without contamination', () => {
    // Before: the 84s were flagged, but they raised the 56's reference so it counted.
    expect(classify([28, 28, 56, 84, 84])).toEqual([
      'counted',
      'counted',
      'possible',
      'possible',
      'possible',
    ]);
    expect(classify([28, 28, 28, 28, 56, 84, 84])).toEqual([
      'counted',
      'counted',
      'counted',
      'counted',
      'missed',
      'missed',
      'missed',
    ]);
    const { prediction } = predict([28, 28, 28, 28, 56, 84, 84]);
    expect(prediction).toMatchObject({
      averageCycleLength: 28,
      completeCycleCount: 4,
      uncertainHistory: false,
      confidence: 'medium',
    });
  });

  it('stays uncertain on a tie between normal cycles and gaps', () => {
    expect(classify([28, 28, 56, 56])).toEqual(['counted', 'counted', 'possible', 'possible']);
  });
});

describe('genuinely long cycles', () => {
  it('counts repeated long cycles that are no multiple of the usual length', () => {
    expect(classify([45, 45, 45])).toEqual(['counted', 'counted', 'counted']);
    expect(predict([45, 45, 45]).prediction).toMatchObject({
      averageCycleLength: 45,
      uncertainHistory: false,
      confidence: 'medium',
    });
  });

  it('confirms long cycles when days inside the gaps were logged without bleeding', () => {
    expect(classify([60, 60, 60], { observed: true })).toEqual(['counted', 'counted', 'counted']);
    const { prediction, opensAfter } = predict([60, 60, 60], { observed: true });
    expect(prediction).toMatchObject({ averageCycleLength: 60, uncertainHistory: false });
    expect(opensAfter).toBe(57);
  });

  it('accepts only entries without period bleeding as evidence', () => {
    expect(
      observedDaysWithoutBleeding([
        { date: '2026-01-01', flow: 'none' },
        { date: '2026-01-02', flow: 'spotting' },
        { date: '2026-01-03', flow: 'light' },
        { date: '2026-01-04', flow: 'heavy' },
      ]),
    ).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('does not let sparse entries confirm a gap', () => {
    const { starts, periodDays } = history([56, 56]);
    // One logged day per week cannot rule out a five-day period in between.
    const weekly = loggedDaily(periodDays).filter((_, index) => index % 7 === 0);
    const cycles = deriveCycles(starts, [], { observedDays: weekly });
    expect(cycles.filter((cycle) => cycle.possibleMissedPeriod)).toHaveLength(2);
  });
});

describe('typical cycle length other than 28', () => {
  it('measures gaps against a 35-day typical length', () => {
    expect(classify([70, 70], { typical: 35 })).toEqual(['possible', 'possible']);
    expect(classify([35, 70, 35], { typical: 35 })).toEqual(['counted', 'missed', 'counted']);
    // 56 days are 1.6 times 35 but no multiple of it: a long cycle, not a gap.
    expect(classify([56, 56], { typical: 35 })).toEqual(['counted', 'counted']);
    expect(predict([70, 70], { typical: 35 }).opensAfter).toBe(35 - 7);
  });

  it('prefers recorded normal cycles over the typical length', () => {
    // Typical 28 from onboarding, but recorded cycles of 33 days: 66 is two of them.
    expect(classify([33, 33, 66, 33], { typical: 28 })).toEqual([
      'counted',
      'counted',
      'missed',
      'counted',
    ]);
    expect(predict([33, 33, 66, 33]).prediction.averageCycleLength).toBe(33);
  });
});

describe('screens agree about uncertain histories', () => {
  it('keeps Trends statistics and the estimate consistent', () => {
    const { starts, periodDays } = history([28, 56, 56]);
    const prediction = calculatePrediction({ periodDays })!;
    const stats = calculateCycleStats(deriveCycles(starts), []);
    expect(stats.usableCycles).toBe(prediction.completeCycleCount);
  });

  it('shows the wide window on Today instead of a day count', () => {
    const { periodDays, starts, last } = history([56, 56]);
    const today = addDays(last, 3);
    const prediction = calculatePrediction({ periodDays, today })!;
    expect(describeDayStatus(today, derivePeriodStarts(periodDays), prediction)).toEqual({
      kind: 'uncertain',
      windowStart: prediction.windowStart,
      windowEnd: prediction.windowEnd,
    });
    expect(starts).toHaveLength(3);
    // Past the wide window the estimate is overdue like any other.
    const late = addDays(prediction.windowEnd, 1);
    const overdue = calculatePrediction({ periodDays, today: late })!;
    expect(describeDayStatus(late, derivePeriodStarts(periodDays), overdue).kind).toBe('overdue');
  });
});
