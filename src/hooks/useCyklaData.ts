import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  completeOnboarding,
  deleteAllLocalData,
  deleteDailyEntry,
  getAllEntries,
  getEntry,
  getExcludedCycleStarts,
  getSettings,
  saveDailyEntry,
  setSetting,
  toggleCycleExclusion,
  type OnboardingInput,
  type SaveDailyEntryInput,
} from '@/database/repository';

export function useSettings() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(db),
  });
}

export function useEntries() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['entries'],
    queryFn: () => getAllEntries(db),
  });
}

export function useEntry(date: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['entry', date],
    queryFn: () => getEntry(db, date),
  });
}

export function useExcludedCycles() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['cycle-exclusions'],
    queryFn: () => getExcludedCycleStarts(db),
  });
}

export function useCompleteOnboarding() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingInput) => completeOnboarding(db, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}

export function useSaveEntry() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDailyEntryInput) => saveDailyEntry(db, input),
    onSuccess: async (_, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['entries'] }),
        queryClient.invalidateQueries({ queryKey: ['entry', input.date] }),
      ]);
    },
  });
}

export function useDeleteEntry() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => deleteDailyEntry(db, date),
    onSuccess: async (_, date) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['entries'] }),
        queryClient.invalidateQueries({ queryKey: ['entry', date] }),
      ]);
    },
  });
}

export function useToggleCycleExclusion() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ startDate, excluded }: { startDate: string; excluded: boolean }) =>
      toggleCycleExclusion(db, startDate, excluded),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cycle-exclusions'] });
    },
  });
}

export function useUpdateSetting() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      value,
    }: {
      key: Parameters<typeof setSetting>[1];
      value: string | number | boolean;
    }) => setSetting(db, key, value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useResetData() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllLocalData(db),
    onSuccess: async () => {
      queryClient.clear();
    },
  });
}
