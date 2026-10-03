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

export type Cycle = {
  startDate: string;
  nextStartDate: string | null;
  lengthDays: number | null;
  excluded: boolean;
  // About a multiple of the usual length while normal cycles clearly dominate: most
  // likely a period was not recorded. Stays visible but is left out of averages.
  likelyMissedPeriod: boolean;
  // About a multiple of the usual length without such dominance: a long cycle or a
  // missed entry. Still counted, but the estimate is marked as uncertain.
  possibleMissedPeriod: boolean;
};

export type Prediction = {
  expectedStart: string;
  windowStart: string;
  windowEnd: string;
  expectedPeriodEnd: string;
  // Null when the data does not support a day-level estimate; never means "infertile".
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  estimatedOvulation: string | null;
  averageCycleLength: number;
  variationDays: number;
  confidence: Confidence;
  completeCycleCount: number;
  // Some cycles may be long cycles or missed entries; the window covers both readings.
  uncertainHistory: boolean;
  // The whole window lies before today and no newer period start is recorded.
  overdue: boolean;
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
