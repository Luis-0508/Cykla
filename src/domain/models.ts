import type { LanguagePreference } from '@/i18n/i18n';

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type Mood = 'calm' | 'happy' | 'sensitive' | 'irritable' | 'sad' | 'stressed';
export type Confidence = 'low' | 'medium' | 'high';
export type Goal = 'track' | 'conceive' | 'unsure';

export type DailyEntry = {
  date: string;
  flow: FlowIntensity;
  mood: Mood | null;
  pain: number | null;
  energy: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  notes: string;
  symptoms: SymptomEntry[];
  updatedAt: string;
};

export type SymptomEntry = {
  id: string;
  date: string;
  code: string;
  intensity: number;
};

/** Validated contents of a JSON export, ready to restore. */
export type BackupData = {
  version: 1 | 2;
  settings: Pick<AppSettings, 'goal' | 'typicalCycleLength' | 'typicalPeriodLength'>;
  entries: DailyEntry[];
  excludedCycleStarts: string[];
};

export type Cycle = {
  startDate: string;
  nextStartDate: string | null;
  lengthDays: number | null;
  excluded: boolean;
};

export type Prediction = {
  expectedStart: string;
  windowStart: string;
  windowEnd: string;
  expectedPeriodEnd: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  estimatedOvulation: string;
  averageCycleLength: number;
  variationDays: number;
  confidence: Confidence;
  completeCycleCount: number;
};

export type AppSettings = {
  onboardingCompleted: boolean;
  goal: Goal;
  typicalCycleLength: number;
  typicalPeriodLength: number;
  theme: 'system' | 'light' | 'dark';
  language: LanguagePreference;
  dailyReminderEnabled: boolean;
};
