import { z } from 'zod';
import { dateSchema } from '@/database/validation';
import type { BackupData } from '@/domain/models';

// Do not allow an untrusted file to allocate an unbounded number of entries.
const MAX_BACKUP_LENGTH = 10 * 1024 * 1024;
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
  pain: z.number().int().min(0).max(10).nullable(),
  energy: z.number().int().min(1).max(5).nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  sleepQuality: z.number().int().min(1).max(5).nullable(),
  notes: z.string(),
  symptoms: z.array(symptomSchema),
  updatedAt: z.string(),
});
const fileSchema = z.object({
  format: z.literal('cykla-export'),
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  notice: z.string().optional(),
  settings: z.object({
    goal: z.enum(['track', 'conceive', 'unsure']),
    typicalCycleLength: z.number().int().min(20).max(60),
    typicalPeriodLength: z.number().int().min(1).max(10),
  }),
  entries: z.array(entrySchema).max(10000),
  excludedCycleStarts: z.array(dateSchema).optional(),
});

export function parseBackup(content: string): BackupData {
  if (content.length > MAX_BACKUP_LENGTH) throw new Error('Die Sicherungsdatei ist zu groß.');
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }
  const parsed = fileSchema.safeParse(value);
  if (!parsed.success || (parsed.data?.version === 2 && !parsed.data.excludedCycleStarts)) {
    throw new Error('Die Datei ist kein unterstützter Cykla-Export.');
  }
  const file = parsed.data;
  const dates = new Set<string>();
  const ids = new Set<string>();
  for (const entry of file.entries) {
    if (dates.has(entry.date)) throw new Error('Die Sicherung enthält doppelte Kalendertage.');
    dates.add(entry.date);
    for (const symptom of entry.symptoms) {
      if (symptom.date !== entry.date || ids.has(symptom.id)) {
        throw new Error('Die Sicherung enthält widersprüchliche Symptomdaten.');
      }
      ids.add(symptom.id);
    }
  }
  const excludedCycleStarts = file.version === 2 ? file.excludedCycleStarts! : [];
  if (new Set(excludedCycleStarts).size !== excludedCycleStarts.length) {
    throw new Error('Die Sicherung enthält doppelte Zyklusausschlüsse.');
  }
  return {
    version: file.version,
    entries: file.entries,
    settings: file.settings,
    excludedCycleStarts,
  };
}
