import { useMemo } from 'react';
import { deriveCycles, derivePeriodStarts, calculatePrediction } from '@/domain/prediction';
import { useEntries, useExcludedCycles, useSettings } from '@/hooks/useCyklaData';

export function usePrediction() {
  const entriesQuery = useEntries();
  const settingsQuery = useSettings();
  const exclusionsQuery = useExcludedCycles();

  const derived = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const periodDays = entries
      .filter((entry) => entry.flow !== 'none' && entry.flow !== 'spotting')
      .map((entry) => entry.date);
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
