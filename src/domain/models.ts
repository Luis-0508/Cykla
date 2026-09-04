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
  explanation: string;
};

export type AppSettings = {
  onboardingCompleted: boolean;
  goal: Goal;
  typicalCycleLength: number;
  typicalPeriodLength: number;
  theme: 'system' | 'light' | 'dark';
  dailyReminderEnabled: boolean;
};
