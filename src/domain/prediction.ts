import { addDays, compareDates, differenceInDays } from '@/domain/dateOnly';
import type { Cycle, Prediction } from '@/domain/models';

type PredictionInput = {
  periodDays: string[];
  excludedCycleStarts?: string[];
  fallbackCycleLength?: number;
  fallbackPeriodLength?: number;
};

export function derivePeriodStarts(periodDays: string[]): string[] {
  const unique = [...new Set(periodDays)].sort(compareDates);
  return unique.filter(
    (date, index) => index === 0 || differenceInDays(date, unique[index - 1]!) > 1,
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
      cycle.lengthDays !== null &&
      cycle.lengthDays >= 15 &&
      cycle.lengthDays <= 90 &&
      !cycle.excluded,
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
  const spread =
    lengths.length < 3
      ? Math.max(3, Math.ceil(variation))
      : Math.max(1, Math.ceil(variation * 1.25));
  const latestStart = starts.at(-1)!;
  const expectedStart = addDays(latestStart, roundedAverage);

  let confidence: Prediction['confidence'] = 'low';
  if (lengths.length >= 6 && variation <= 3) confidence = 'high';
  else if (lengths.length >= 3 && variation <= 7) confidence = 'medium';

  const explanation =
    lengths.length < 3
      ? lengths.length === 1
        ? 'Bisher liegt 1 vollständiger Zyklus vor. Deshalb ist der Zeitraum bewusst weiter gefasst.'
        : `Bisher liegen ${lengths.length} vollständige Zyklen vor. Deshalb ist der Zeitraum bewusst weiter gefasst.`
      : `Die Schätzung nutzt ${lengths.length} vollständige Zyklen. Neuere Zyklen zählen etwas stärker; auffällige Abweichungen etwas schwächer.`;

  const estimatedOvulation = addDays(expectedStart, -14);
  return {
    expectedStart,
    windowStart: addDays(expectedStart, -spread),
    windowEnd: addDays(expectedStart, spread),
    expectedPeriodEnd: addDays(expectedStart, Math.max(1, fallbackPeriodLength) - 1),
    fertileWindowStart: addDays(estimatedOvulation, -5),
    fertileWindowEnd: addDays(estimatedOvulation, 1),
    estimatedOvulation,
    averageCycleLength: roundedAverage,
    variationDays: Math.round(variation * 10) / 10,
    confidence,
    completeCycleCount: lengths.length,
    explanation,
  };
}
