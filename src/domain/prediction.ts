import { addDays, compareDates, differenceInDays } from '@/domain/dateOnly';
import type { Cycle, DailyEntry, Prediction } from '@/domain/models';

type PredictionInput = {
  periodDays: string[];
  excludedCycleStarts?: string[];
  fallbackCycleLength?: number;
  fallbackPeriodLength?: number;
  // Days with an entry but without bleeding that counts for estimates (see `observedDaysWithoutBleeding`).
  observedDays?: string[];
  // The device's local calendar day; marks an estimate whose window has passed as overdue.
  today?: string;
};

type CycleOptions = {
  fallbackCycleLength?: number;
  observedDays?: string[];
};

// Lengths outside this range usually mean missing or extra records, not a cycle.
const MIN_CYCLE_LENGTH = 15;
const MAX_CYCLE_LENGTH = 90;
const DEFAULT_CYCLE_LENGTH = 28;
// From this multiple of the usual length on, a cycle may span a period that was not
// recorded (two cycles are about 2x). Shorter long cycles always count as recorded.
const MISSED_PERIOD_RATIO = 1.6;
// How far k cycles may drift from k times the usual length and still look like k cycles.
const MULTIPLE_TOLERANCE = 0.15;
// A logged period lasts more than two days, so it cannot hide in two unlogged days.
const MAX_UNLOGGED_RUN = 2;

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

/** Days with a saved entry but no bleeding that counts for estimates. */
export function observedDaysWithoutBleeding(
  entries: Pick<DailyEntry, 'date' | 'flow'>[],
): string[] {
  const bleeding = new Set(bleedingDaysForEstimates(entries));
  return entries.filter((entry) => !bleeding.has(entry.date)).map((entry) => entry.date);
}

/** A single undocumented day inside a bleeding episode does not start a new period. */
export function derivePeriodStarts(periodDays: string[]): string[] {
  const unique = [...new Set(periodDays)].sort(compareDates);
  return unique.filter(
    (date, index) => index === 0 || differenceInDays(date, unique[index - 1]!) > 2,
  );
}

function countsTowardsLength(cycle: Cycle): boolean {
  return cycle.lengthDays !== null && isPlausibleCycleLength(cycle.lengthDays) && !cycle.excluded;
}

/**
 * Cycles that count towards averages: complete, plausible, not excluded by the user
 * and not likely to contain an unrecorded period. Ambiguous cycles still count.
 */
export function isUsableCycle(cycle: Cycle): boolean {
  return countsTowardsLength(cycle) && !cycle.likelyMissedPeriod;
}

/**
 * The usual cycle length that gaps are compared with: the median of the recorded
 * cycles shorter than 1.6 times the typical length from onboarding, or that typical
 * length itself. Long gaps never feed into it, so several gaps cannot raise the
 * reference for each other.
 */
function baseCycleLength(lengths: number[], typicalLength: number): number {
  const normal = lengths.filter((length) => length < typicalLength * MISSED_PERIOD_RATIO);
  return normal.length ? median(normal) : typicalLength;
}

// k > 1 when `length` is about k cycles of `base`, otherwise 1.
function cycleMultiple(length: number, base: number): number {
  if (length < base * MISSED_PERIOD_RATIO) return 1;
  const multiple = Math.round(length / base);
  const tolerance = Math.max(4, MULTIPLE_TOLERANCE * multiple * base);
  return Math.abs(length - multiple * base) <= tolerance ? multiple : 1;
}

/**
 * True when the user logged days around every place where a skipped period would
 * have started, without recorded bleeding: then the gap is one long cycle.
 */
function gapWasObserved(cycle: Cycle, multiple: number, base: number, observed: Set<string>) {
  const halfWidth = Math.max(3, Math.round(base * MULTIPLE_TOLERANCE));
  for (let index = 1; index < multiple; index++) {
    const expected = addDays(cycle.startDate, Math.round((index * cycle.lengthDays!) / multiple));
    let unlogged = 0;
    for (let offset = -halfWidth; offset <= halfWidth; offset++) {
      unlogged = observed.has(addDays(expected, offset)) ? 0 : unlogged + 1;
      if (unlogged > MAX_UNLOGGED_RUN) return false;
    }
  }
  return true;
}

export function deriveCycles(
  periodStarts: string[],
  excludedStarts: string[] = [],
  { fallbackCycleLength = DEFAULT_CYCLE_LENGTH, observedDays = [] }: CycleOptions = {},
): Cycle[] {
  const sorted = [...new Set(periodStarts)].sort(compareDates);
  const cycles = sorted.map((startDate, index): Cycle => {
    const nextStartDate = sorted[index + 1] ?? null;
    return {
      startDate,
      nextStartDate,
      lengthDays: nextStartDate ? differenceInDays(nextStartDate, startDate) : null,
      excluded: excludedStarts.includes(startDate),
      likelyMissedPeriod: false,
      possibleMissedPeriod: false,
    };
  });
  const counted = cycles.filter(countsTowardsLength);
  const lengths = counted.map((cycle) => cycle.lengthDays!);
  const base = baseCycleLength(lengths, fallbackCycleLength);
  const observed = new Set(observedDays);
  const suspicious = new Map(
    counted
      .map((cycle) => [cycle, cycleMultiple(cycle.lengthDays!, base)] as const)
      .filter(
        ([cycle, multiple]) => multiple > 1 && !gapWasObserved(cycle, multiple, base, observed),
      ),
  );
  // A gap is only treated as a missed entry when recorded cycles of the usual length
  // clearly outnumber such gaps. Otherwise long cycles and missed entries are equally
  // likely, and the estimate has to cover both instead of choosing one.
  const normalCount = lengths.filter((length) => length < base * MISSED_PERIOD_RATIO).length;
  const missedEntriesExplainGaps = normalCount >= 2 && normalCount > suspicious.size;
  return cycles.map((cycle) =>
    suspicious.has(cycle)
      ? {
          ...cycle,
          likelyMissedPeriod: missedEntriesExplainGaps,
          possibleMissedPeriod: !missedEntriesExplainGaps,
        }
      : cycle,
  );
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

// Few cycles cannot justify a narrow window; even stable cycles keep ±3 days.
function windowSpread(lengths: number[], variation = standardDeviation(lengths, mean(lengths))) {
  if (lengths.length === 0) return 7;
  if (lengths.length < 3) return Math.max(5, Math.ceil(variation));
  return Math.max(3, Math.ceil(variation * 1.5));
}

function laterDate(a: string, b: string): string {
  return compareDates(a, b) >= 0 ? a : b;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function calculatePrediction(input: PredictionInput): Prediction | null {
  const starts = derivePeriodStarts(input.periodDays);
  if (starts.length === 0) return null;

  const fallbackCycleLength = input.fallbackCycleLength ?? DEFAULT_CYCLE_LENGTH;
  const fallbackPeriodLength = input.fallbackPeriodLength ?? 5;
  const cycles = deriveCycles(starts, input.excludedCycleStarts, {
    fallbackCycleLength,
    observedDays: input.observedDays,
  });
  // The same lengths `deriveCycles` derived the usual length from.
  const countedLengths = cycles.filter(countsTowardsLength).map((cycle) => cycle.lengthDays!);
  const usable = cycles.filter(isUsableCycle);
  const lengths = usable.map((cycle) => cycle.lengthDays!);
  const uncertainHistory = usable.some((cycle) => cycle.possibleMissedPeriod);
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
  // Long cycles and missed entries are two readings, not scatter around one length,
  // so an uncertain window takes its margin from the cycles without that doubt.
  const spread = uncertainHistory
    ? windowSpread(usable.filter((cycle) => !cycle.possibleMissedPeriod).map((c) => c.lengthDays!))
    : windowSpread(lengths, variation);
  const latestStart = starts.at(-1)!;
  // With an uncertain history the next period may come after one usual cycle (entries
  // were missed) or after the long recorded cycles. The window spans both and starts
  // with the earlier one, so no long period-free time is promised.
  const lastBleedingDay = [...new Set(input.periodDays)].sort(compareDates).at(-1)!;
  // As in `derivePeriodStarts`, a new period needs more than two days without bleeding,
  // so no estimate may fall into the current bleeding episode, however wide the spread.
  const earliestNextStart = addDays(lastBleedingDay, 3);
  const expectedStart = laterDate(
    addDays(
      latestStart,
      uncertainHistory
        ? Math.round(baseCycleLength(countedLengths, fallbackCycleLength))
        : roundedAverage,
    ),
    earliestNextStart,
  );
  const windowStart = laterDate(addDays(expectedStart, -spread), earliestNextStart);
  // The usual-length anchor is a median and the long reading a recency-weighted mean;
  // recent short cycles can put the latter first, so end after whichever comes later.
  const windowEnd = addDays(
    uncertainHistory
      ? laterDate(addDays(latestStart, roundedAverage), expectedStart)
      : expectedStart,
    spread,
  );

  // An uncertain history never earns more than low confidence.
  let confidence: Prediction['confidence'] = 'low';
  if (uncertainHistory) confidence = 'low';
  else if (lengths.length >= 6 && variation <= 3) confidence = 'high';
  else if (lengths.length >= 3 && variation <= 7) confidence = 'medium';

  // Calendar-only fertility dates are unreliable with little, short, long or
  // irregular history, or when they would start right after recorded bleeding.
  // Hiding them never means that a day is infertile or safe.
  const irregularHistory = lengths.some((length) => length < 24 || length > 38);
  const tooCloseToBleeding = differenceInDays(addDays(expectedStart, -19), lastBleedingDay) <= 2;
  const showFertileWindow =
    confidence !== 'low' && lengths.length >= 3 && !irregularHistory && !tooCloseToBleeding;
  const estimatedOvulation = showFertileWindow ? addDays(expectedStart, -14) : null;
  return {
    expectedStart,
    windowStart,
    windowEnd,
    expectedPeriodEnd: addDays(expectedStart, Math.max(1, fallbackPeriodLength) - 1),
    fertileWindowStart: estimatedOvulation ? addDays(estimatedOvulation, -5) : null,
    fertileWindowEnd: estimatedOvulation ? addDays(estimatedOvulation, 1) : null,
    estimatedOvulation,
    averageCycleLength: roundedAverage,
    variationDays: Math.round(variation * 10) / 10,
    confidence,
    completeCycleCount: lengths.length,
    uncertainHistory,
    // No newer start is recorded although the whole window has passed. The estimate is
    // not rolled forward: a late period, a missed entry or a pregnancy look the same here.
    overdue: input.today !== undefined && compareDates(input.today, windowEnd) > 0,
  };
}
