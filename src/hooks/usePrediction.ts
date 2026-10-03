import { useMemo } from 'react';
import { todayDate } from '@/domain/dateOnly';
import {
  bleedingDaysForEstimates,
  calculatePrediction,
  deriveCycles,
  derivePeriodStarts,
  observedDaysWithoutBleeding,
} from '@/domain/prediction';
import { useEntries, useExcludedCycles, useSettings } from '@/hooks/useCyklaData';

export function usePrediction() {
  const entriesQuery = useEntries();
  const settingsQuery = useSettings();
  const exclusionsQuery = useExcludedCycles();
  // A string, so the memo below only recalculates when the local day changes.
  const today = todayDate();

  const derived = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const periodDays = bleedingDaysForEstimates(entries);
    const observedDays = observedDaysWithoutBleeding(entries);
    const starts = derivePeriodStarts(periodDays);
    const excludedStarts = exclusionsQuery.data ?? [];
    const settings = settingsQuery.data;
    return {
      entries,
      periodDays,
      starts,
      cycles: deriveCycles(starts, excludedStarts, {
        fallbackCycleLength: settings?.typicalCycleLength,
        observedDays,
      }),
      prediction: calculatePrediction({
        periodDays,
        excludedCycleStarts: excludedStarts,
        fallbackCycleLength: settings?.typicalCycleLength,
        fallbackPeriodLength: settings?.typicalPeriodLength,
        observedDays,
        today,
      }),
    };
  }, [entriesQuery.data, exclusionsQuery.data, settingsQuery.data, today]);

  return {
    ...derived,
    settings: settingsQuery.data,
    isLoading: entriesQuery.isLoading || settingsQuery.isLoading || exclusionsQuery.isLoading,
    error: entriesQuery.error ?? settingsQuery.error ?? exclusionsQuery.error,
  };
}
