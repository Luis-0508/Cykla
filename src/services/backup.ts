import { z } from 'zod';
import { dateSchema } from '@/database/validation';
import type { BackupData } from '@/domain/models';

// Bounds an untrusted file before parsing; real exports are far smaller.
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export type BackupErrorCode =
  | 'tooLarge'
  | 'invalidJson'
  | 'unsupported'
  | 'duplicateDates'
  | 'inconsistentSymptoms'
  | 'duplicateExclusions';

/** Carries a code instead of copy so the UI can show a localized message. */
export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(`Invalid Cykla backup: ${code}`);
    this.name = 'BackupError';
  }
}

const scale = (min: number, max: number) => z.number().int().min(min).max(max).nullable();
const symptomSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  code: z.string().min(1),
  intensity: z.number().int().min(1).max(3),
});
const entrySchema = z.object({
  date: dateSchema,
  flow: z.enum(['none', 'spotting', 'light', 'medium', 'heavy']),
  mood: z.enum(['calm', 'happy', 'sensitive', 'irritable', 'sad', 'stressed']).nullable(),
  pain: scale(0, 10),
  energy: scale(1, 5),
  sleepHours: z.number().min(0).max(24).nullable(),
  sleepQuality: scale(1, 5),
  notes: z.string(),
  symptoms: z.array(symptomSchema),
  updatedAt: z.string(),
});
const settingsSchema = z.object({
  goal: z.enum(['track', 'conceive', 'unsure']),
  typicalCycleLength: z.number().int().min(20).max(60),
  typicalPeriodLength: z.number().int().min(1).max(10),
});
const fileSchema = z.discriminatedUnion('version', [
  // Version 1 files predate cycle exclusions.
  z.object({
    format: z.literal('cykla-export'),
    version: z.literal(1),
    settings: settingsSchema,
    entries: z.array(entrySchema).max(10000),
  }),
  z.object({
    format: z.literal('cykla-export'),
    version: z.literal(2),
    settings: settingsSchema,
    entries: z.array(entrySchema).max(10000),
    excludedCycleStarts: z.array(dateSchema).max(10000),
  }),
]);

/** Validates a complete backup before anything is written. Throws `BackupError`. */
export function parseBackup(content: string): BackupData {
  if (content.length > MAX_BACKUP_BYTES) throw new BackupError('tooLarge');
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new BackupError('invalidJson');
  }
  const parsed = fileSchema.safeParse(value);
  if (!parsed.success) throw new BackupError('unsupported');
  const file = parsed.data;

  const dates = new Set<string>();
  const symptomIds = new Set<string>();
  for (const entry of file.entries) {
    if (dates.has(entry.date)) throw new BackupError('duplicateDates');
    dates.add(entry.date);
    for (const symptom of entry.symptoms) {
      if (symptom.date !== entry.date || symptomIds.has(symptom.id)) {
        throw new BackupError('inconsistentSymptoms');
      }
      symptomIds.add(symptom.id);
    }
  }
  const excludedCycleStarts = file.version === 2 ? file.excludedCycleStarts : [];
  if (new Set(excludedCycleStarts).size !== excludedCycleStarts.length) {
    throw new BackupError('duplicateExclusions');
  }
  return {
    version: file.version,
    settings: file.settings,
    entries: file.entries,
    excludedCycleStarts,
  };
}
