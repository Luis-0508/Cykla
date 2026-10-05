import { useMemo } from 'react';
import {
  bleedingDaysForEstimates,
  calculatePrediction,
  deriveCycles,
  derivePeriodStarts,
  hasOnlyAmbiguousHistory,
  observedDaysWithoutBleeding,
} from '@/domain/prediction';
import { useEntries, useExcludedCycles, useSettings } from '@/hooks/useCyklaData';
import { useLocalToday } from '@/hooks/useLocalToday';

export function usePrediction() {
  const entriesQuery = useEntries();
  const settingsQuery = useSettings();
  const exclusionsQuery = useExcludedCycles();
  // Changes at local midnight and on resume, so an open screen notices an overdue window.
  const today = useLocalToday();

  const derived = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const periodDays = bleedingDaysForEstimates(entries);
    const observedDays = observedDaysWithoutBleeding(entries);
    const starts = derivePeriodStarts(periodDays);
    const excludedStarts = exclusionsQuery.data ?? [];
    const settings = settingsQuery.data;
    const cycles = deriveCycles(starts, excludedStarts, {
      fallbackCycleLength: settings?.typicalCycleLength,
      observedDays,
    });
    const ambiguousHistory = hasOnlyAmbiguousHistory(cycles);
    return {
      entries,
      periodDays,
      starts,
      cycles,
      ambiguousHistory,
      prediction: ambiguousHistory
        ? null
        : calculatePrediction({
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
