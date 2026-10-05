import { describe, expect, it } from 'vitest';
import { addDays, eachDay } from '@/domain/dateOnly';
import {
  bleedingDaysForEstimates,
  calculatePrediction,
  deriveCycles,
  derivePeriodStarts,
  derivePrediction,
  hasOnlyAmbiguousHistory,
} from '@/domain/prediction';
import { calculateCycleStats } from '@/domain/statistics';

// Fictional dates and flows reproducing a 78-day interval, not a device database.
const days = [...eachDay('2026-07-15', '2026-07-19'), ...eachDay('2026-10-01', '2026-10-03')];
const cyclesFor = (periodDays: string[], observedDays: string[] = []) =>
  deriveCycles(derivePeriodStarts(periodDays), [], { observedDays });

describe('sparse ambiguous history', () => {
  it('keeps observed 78-day statistics but uses the typical length provisionally', () => {
    const result = derivePrediction({ periodDays: days, fallbackCycleLength: 28 });
    expect(result.predictionState).toBe('provisional');
    expect(calculateCycleStats(result.cycles, [])).toMatchObject({
      averageLength: 78,
      shortest: 78,
      longest: 78,
      usableCycles: 1,
    });
    expect(result.prediction).toMatchObject({
      expectedStart: '2026-10-29',
      windowStart: '2026-10-22',
      windowEnd: '2026-11-05',
      averageCycleLength: 28,
      completeCycleCount: 0,
      confidence: 'low',
      uncertainHistory: false,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      estimatedOvulation: null,
    });
  });

  it.each([20, 30, 35])(
    'uses the actual onboarding value %i, not a fixed 28-day length',
    (typical) => {
      const result = derivePrediction({ periodDays: days, fallbackCycleLength: typical });
      expect(result.predictionState).toBe('provisional');
      expect(result.prediction!.expectedStart).toBe(addDays('2026-10-01', typical));
      expect(result.prediction!.windowStart).toBe(addDays('2026-10-01', typical - 7));
      expect(result.prediction!.windowEnd).toBe(addDays('2026-10-01', typical + 7));
    },
  );

  it('uses the fallback window for overdue status without rolling it forward', () => {
    const input = { periodDays: days, fallbackCycleLength: 28 };
    expect(derivePrediction({ ...input, today: '2026-11-05' }).prediction!.overdue).toBe(false);
    expect(derivePrediction({ ...input, today: '2026-11-06' }).prediction).toMatchObject({
      overdue: true,
      expectedStart: '2026-10-29',
      windowEnd: '2026-11-05',
    });
  });

  it('retains the latest bleeding guard even when the fallback is provisional', () => {
    const periodDays = [...days, ...eachDay('2026-10-01', '2026-11-02')];
    expect(derivePrediction({ periodDays }).prediction).toMatchObject({
      expectedStart: '2026-11-05',
      windowStart: '2026-11-05',
      windowEnd: '2026-11-12',
    });
  });

  it('has no estimate without a start and a provisional estimate with only one start', () => {
    expect(derivePrediction({ periodDays: [] })).toEqual({
      cycles: [],
      prediction: null,
      predictionState: 'none',
    });
    expect(derivePrediction({ periodDays: ['2026-10-01'] }).predictionState).toBe('provisional');
  });

  it.each([[28], [28, 56], [28, 56, 28], [45, 45]])(
    'preserves personalized predictions for ordinary, mixed and genuine long histories %j',
    (...lengths) => {
      const periodDays = ['2026-01-01'];
      for (const length of lengths) periodDays.push(addDays(periodDays.at(-1)!, length));
      const result = derivePrediction({ periodDays });
      expect(result.predictionState).toBe('personalized');
      expect(result.prediction).toEqual(calculatePrediction({ periodDays }));
    },
  );

  it('reproduces the internal 78-day alternative range without endorsing it for display', () => {
    const cycles = cyclesFor(days);
    expect(cycles[0]).toMatchObject({ lengthDays: 78, possibleMissedPeriod: true });
    expect(calculateCycleStats(cycles, [])).toMatchObject({
      averageLength: 78,
      shortest: 78,
      longest: 78,
      usableCycles: 1,
    });
    expect(calculatePrediction({ periodDays: days })).toMatchObject({
      averageCycleLength: 78,
      completeCycleCount: 1,
      uncertainHistory: true,
      confidence: 'low',
      windowStart: '2026-10-22',
      windowEnd: '2026-12-25',
    });
    expect(hasOnlyAmbiguousHistory(cycles)).toBe(true);
  });

  it('does not let spotting or a symptom-only day create a start', () => {
    for (const flow of ['spotting', 'none'] as const) {
      const periodDays = bleedingDaysForEstimates([
        ...days.map((date) => ({ date, flow: 'medium' as const })),
        { date: '2026-07-29', flow },
      ]);
      expect(derivePeriodStarts(periodDays)).toEqual(['2026-07-15', '2026-10-01']);
      expect(hasOnlyAmbiguousHistory(cyclesFor(periodDays))).toBe(true);
    }
  });

  it('keeps an isolated light-bleeding day as a start, not as part of the July episode', () => {
    const cycles = cyclesFor([...days, '2026-07-29']);
    expect(cycles.map((cycle) => cycle.lengthDays)).toEqual([14, 64, null]);
    expect(calculateCycleStats(cycles, []).averageLength).toBe(64);
    expect(derivePeriodStarts(['2026-07-15', '2026-07-17'])).toEqual(['2026-07-15']);
  });

  it('allows one observed long cycle and one ordinary complete cycle', () => {
    const observed = eachDay(days[0]!, days.at(-1)!).filter((date) => !days.includes(date));
    expect(hasOnlyAmbiguousHistory(cyclesFor(days, observed))).toBe(false);
    expect(calculatePrediction({ periodDays: days, observedDays: observed })).toMatchObject({
      averageCycleLength: 78,
      uncertainHistory: false,
      confidence: 'low',
      windowStart: '2026-12-13',
      windowEnd: '2026-12-23',
    });
    expect(hasOnlyAmbiguousHistory(deriveCycles(['2026-01-01', '2026-01-29']))).toBe(false);
    expect(hasOnlyAmbiguousHistory([])).toBe(false);
  });

  it('preserves missed-entry classification and mixed-history estimates', () => {
    const starts = ['2026-01-01'];
    for (const length of [28, 56, 28]) starts.push(addDays(starts.at(-1)!, length));
    const cycles = deriveCycles(starts);
    expect(cycles[1]!.likelyMissedPeriod).toBe(true);
    expect(hasOnlyAmbiguousHistory(cycles)).toBe(false);
    const mixed = deriveCycles(['2026-01-01', '2026-01-29', '2026-03-26']);
    expect(mixed[1]!.possibleMissedPeriod).toBe(true);
    expect(hasOnlyAmbiguousHistory(mixed)).toBe(false);
    expect(hasOnlyAmbiguousHistory(deriveCycles(['2026-01-01', '2026-02-26', '2026-04-23']))).toBe(
      true,
    );
  });
});
