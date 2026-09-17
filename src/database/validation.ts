import { z } from 'zod';
import { parseDateOnly } from '@/domain/dateOnly';
import type { AppSettings } from '@/domain/models';

export const dateSchema = z.string().refine((value) => {
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
});
const storedBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');
const storedInteger = (min: number, max: number) =>
  z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));
export const SETTINGS_KEYS = {
  onboardingCompleted: 'onboarding_completed',
  goal: 'goal',
  typicalCycleLength: 'typical_cycle_length',
  typicalPeriodLength: 'typical_period_length',
  theme: 'theme',
  dailyReminderEnabled: 'daily_reminder_enabled',
} as const;
const settingsSchema = z.object({
  onboarding_completed: storedBoolean.catch(false),
  goal: z.enum(['track', 'conceive', 'unsure']).catch('track'),
  typical_cycle_length: storedInteger(20, 60).catch(28),
  typical_period_length: storedInteger(1, 10).catch(5),
  theme: z.enum(['system', 'light', 'dark']).catch('system'),
  daily_reminder_enabled: storedBoolean.catch(false),
});
export function parseSettings(values: Record<string, unknown>): AppSettings {
  const parsed = settingsSchema.parse(values);
  return {
    onboardingCompleted: parsed.onboarding_completed,
    goal: parsed.goal,
    typicalCycleLength: parsed.typical_cycle_length,
    typicalPeriodLength: parsed.typical_period_length,
    theme: parsed.theme,
    dailyReminderEnabled: parsed.daily_reminder_enabled,
  };
}
const nullableScale = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().catch(null);
// Invalid dates must not reach calendar math. Reading never overwrites stored data.
export const dailyRowSchema = z.object({
  date: dateSchema,
  flow: z.enum(['none', 'spotting', 'light', 'medium', 'heavy']).catch('none'),
  mood: z
    .enum(['calm', 'happy', 'sensitive', 'irritable', 'sad', 'stressed'])
    .nullable()
    .catch(null),
  pain: nullableScale(0, 10),
  energy: nullableScale(1, 5),
  sleep_hours: z.number().min(0).max(24).nullable().catch(null),
  sleep_quality: nullableScale(1, 5),
  notes: z.string().catch(''),
  updated_at: z.string().catch(''),
});
export const symptomRowSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  code: z.string().min(1), // Preserve future/custom symptom codes.
  intensity: z.number().int().min(1).max(3).catch(1),
});
