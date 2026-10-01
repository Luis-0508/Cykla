import { useMemo } from 'react';
import {
  bleedingDaysForEstimates,
  calculatePrediction,
  deriveCycles,
  derivePeriodStarts,
} from '@/domain/prediction';
import { useEntries, useExcludedCycles, useSettings } from '@/hooks/useCyklaData';

export function usePrediction() {
  const entriesQuery = useEntries();
  const settingsQuery = useSettings();
  const exclusionsQuery = useExcludedCycles();

  const derived = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const periodDays = bleedingDaysForEstimates(entries);
    const starts = derivePeriodStarts(periodDays);
    const excludedStarts = exclusionsQuery.data ?? [];
    const settings = settingsQuery.data;
    return {
      entries,
      periodDays,
      starts,
      cycles: deriveCycles(starts, excludedStarts),
      prediction: calculatePrediction({
        periodDays,
        excludedCycleStarts: excludedStarts,
        fallbackCycleLength: settings?.typicalCycleLength,
        fallbackPeriodLength: settings?.typicalPeriodLength,
      }),
    };
  }, [entriesQuery.data, exclusionsQuery.data, settingsQuery.data]);

  return {
    ...derived,
    settings: settingsQuery.data,
    isLoading: entriesQuery.isLoading || settingsQuery.isLoading || exclusionsQuery.isLoading,
    error: entriesQuery.error ?? settingsQuery.error ?? exclusionsQuery.error,
  };
}
