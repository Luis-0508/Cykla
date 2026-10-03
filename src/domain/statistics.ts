import type { Cycle, DailyEntry } from '@/domain/models';
import { isUsableCycle } from '@/domain/prediction';

export type CycleStats = {
  usableCycles: number;
  averageLength: number | null;
  shortest: number | null;
  longest: number | null;
  documentedDays: number;
  symptomDays: number;
};

export function calculateCycleStats(cycles: Cycle[], entries: DailyEntry[]): CycleStats {
  // The same cycles as the prediction, so Trends and estimates cannot disagree.
  const lengths = cycles.filter(isUsableCycle).map((cycle) => cycle.lengthDays!);
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
