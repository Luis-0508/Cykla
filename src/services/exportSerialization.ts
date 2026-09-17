import type { AppSettings, DailyEntry } from '@/domain/models';

function protectSpreadsheetCell(value: string): string {
  return /^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown): string {
  const normalized = protectSpreadsheetCell(value == null ? '' : String(value));
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function entriesToCsv(entries: DailyEntry[]): string {
  const header = [
    'Datum',
    'Blutung',
    'Stimmung',
    'Schmerz_0_bis_10',
    'Energie_1_bis_5',
    'Schlaf_Stunden',
    'Schlafqualitaet_1_bis_5',
    'Symptome',
    'Notizen',
  ];
  const rows = entries.map((entry) =>
    [
      entry.date,
      entry.flow,
      entry.mood,
      entry.pain,
      entry.energy,
      entry.sleepHours,
      entry.sleepQuality,
      entry.symptoms.map((symptom) => symptom.code).join('|'),
      entry.notes,
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...rows].join('\n');
}

export function entriesToJson(
  entries: DailyEntry[],
  settings: AppSettings,
  now = new Date(),
): string {
  const payload = {
    format: 'cykla-export',
    version: 1,
    exportedAt: now.toISOString(),
    notice: 'Enthält dokumentierte Daten. Prognosen werden nicht exportiert oder gespeichert.',
    settings: {
      goal: settings.goal,
      typicalCycleLength: settings.typicalCycleLength,
      typicalPeriodLength: settings.typicalPeriodLength,
    },
    entries,
  };
  return JSON.stringify(payload, null, 2);
}
