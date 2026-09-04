import { create } from 'zustand';
import { todayDate } from '@/domain/dateOnly';

export type ThemeMode = 'system' | 'light' | 'dark';

type UiState = {
  themeMode: ThemeMode;
  selectedDate: string;
  locked: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setSelectedDate: (date: string) => void;
  setLocked: (locked: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  themeMode: 'system',
  selectedDate: todayDate(),
  locked: false,
  setThemeMode: (themeMode) => set({ themeMode }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setLocked: (locked) => set({ locked }),
}));
