import type { Cycle, DailyEntry } from '@/domain/models';
import { isPlausibleCycleLength } from '@/domain/prediction';

export type CycleStats = {
  usableCycles: number;
  averageLength: number | null;
  shortest: number | null;
  longest: number | null;
  documentedDays: number;
  symptomDays: number;
};

export function calculateCycleStats(cycles: Cycle[], entries: DailyEntry[]): CycleStats {
  const lengths = cycles
    .filter(
      (cycle) =>
        !cycle.excluded && cycle.lengthDays !== null && isPlausibleCycleLength(cycle.lengthDays),
    )
    .map((cycle) => cycle.lengthDays!);
  return {
    usableCycles: lengths.length,
    averageLength: lengths.length
      ? Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length)
      : null,
    shortest: lengths.length ? Math.min(...lengths) : null,
    longest: lengths.length ? Math.max(...lengths) : null,
    documentedDays: entries.length,
    symptomDays: entries.filter((entry) => entry.symptoms.length > 0).length,
  };
}
