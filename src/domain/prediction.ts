import { addDays, compareDates, differenceInDays } from '@/domain/dateOnly';
import type { Cycle, DailyEntry, Prediction } from '@/domain/models';

type PredictionInput = {
  periodDays: string[];
  excludedCycleStarts?: string[];
  fallbackCycleLength?: number;
  fallbackPeriodLength?: number;
};

// Lengths outside this range usually mean missing or extra records, not a cycle.
const MIN_CYCLE_LENGTH = 15;
const MAX_CYCLE_LENGTH = 90;

export function isPlausibleCycleLength(length: number): boolean {
  return length >= MIN_CYCLE_LENGTH && length <= MAX_CYCLE_LENGTH;
}

/**
 * Recorded light, medium or heavy bleeding. Spotting stays a recorded observation
 * but does not mark a period start, so isolated spotting cannot split a cycle.
 */
export function bleedingDaysForEstimates(entries: Pick<DailyEntry, 'date' | 'flow'>[]): string[] {
  return entries
    .filter((entry) => entry.flow !== 'none' && entry.flow !== 'spotting')
    .map((entry) => entry.date);
}

/** A single undocumented day inside a bleeding episode does not start a new period. */
export function derivePeriodStarts(periodDays: string[]): string[] {
  const unique = [...new Set(periodDays)].sort(compareDates);
  return unique.filter(
    (date, index) => index === 0 || differenceInDays(date, unique[index - 1]!) > 2,
  );
}

export function deriveCycles(periodStarts: string[], excludedStarts: string[] = []): Cycle[] {
  const sorted = [...new Set(periodStarts)].sort(compareDates);
  return sorted.map((startDate, index) => {
    const nextStartDate = sorted[index + 1] ?? null;
    return {
      startDate,
      nextStartDate,
      lengthDays: nextStartDate ? differenceInDays(nextStartDate, startDate) : null,
      excluded: excludedStarts.includes(startDate),
    };
  });
}

function standardDeviation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[midpoint]!;
  return (sorted[midpoint - 1]! + sorted[midpoint]!) / 2;
}

export function calculatePrediction(input: PredictionInput): Prediction | null {
  const starts = derivePeriodStarts(input.periodDays);
  if (starts.length === 0) return null;

  const fallbackCycleLength = input.fallbackCycleLength ?? 28;
  const fallbackPeriodLength = input.fallbackPeriodLength ?? 5;
  const cycles = deriveCycles(starts, input.excludedCycleStarts);
  const complete = cycles.filter(
    (cycle) =>
      cycle.lengthDays !== null && isPlausibleCycleLength(cycle.lengthDays) && !cycle.excluded,
  );
  const lengths = complete.map((cycle) => cycle.lengthDays!);
  const center = lengths.length ? median(lengths) : fallbackCycleLength;

  let weightedSum = 0;
  let totalWeight = 0;
  lengths.forEach((length, index) => {
    const age = lengths.length - index - 1;
    const recencyWeight = Math.pow(0.85, age);
    const outlierWeight = Math.abs(length - center) > Math.max(7, center * 0.25) ? 0.35 : 1;
    const weight = recencyWeight * outlierWeight;
    weightedSum += length * weight;
    totalWeight += weight;
  });

  const average = lengths.length ? weightedSum / totalWeight : fallbackCycleLength;
  const variation = standardDeviation(lengths, average);
  const roundedAverage = Math.round(average);
  // Few cycles cannot justify a narrow window; even stable cycles keep ±3 days.
  const spread =
    lengths.length === 0
      ? 7
      : lengths.length < 3
        ? Math.max(5, Math.ceil(variation))
        : Math.max(3, Math.ceil(variation * 1.5));
  const latestStart = starts.at(-1)!;
  const expectedStart = addDays(latestStart, roundedAverage);

  let confidence: Prediction['confidence'] = 'low';
  if (lengths.length >= 6 && variation <= 3) confidence = 'high';
  else if (lengths.length >= 3 && variation <= 7) confidence = 'medium';

  // Calendar-only fertility dates are unreliable with little, short, long or
  // irregular history, or when they would start right after recorded bleeding.
  // Hiding them never means that a day is infertile or safe.
  const irregularHistory = lengths.some((length) => length < 24 || length > 38);
  const lastBleedingDay = [...new Set(input.periodDays)].sort(compareDates).at(-1)!;
  const tooCloseToBleeding = differenceInDays(addDays(expectedStart, -19), lastBleedingDay) <= 2;
  const showFertileWindow =
    confidence !== 'low' && lengths.length >= 3 && !irregularHistory && !tooCloseToBleeding;
  const estimatedOvulation = showFertileWindow ? addDays(expectedStart, -14) : null;
  return {
    expectedStart,
    windowStart: addDays(expectedStart, -spread),
    windowEnd: addDays(expectedStart, spread),
    expectedPeriodEnd: addDays(expectedStart, Math.max(1, fallbackPeriodLength) - 1),
    fertileWindowStart: estimatedOvulation ? addDays(estimatedOvulation, -5) : null,
    fertileWindowEnd: estimatedOvulation ? addDays(estimatedOvulation, 1) : null,
    estimatedOvulation,
    averageCycleLength: roundedAverage,
    variationDays: Math.round(variation * 10) / 10,
    confidence,
    completeCycleCount: lengths.length,
  };
}
