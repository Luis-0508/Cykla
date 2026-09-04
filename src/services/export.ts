import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppSettings, DailyEntry } from '@/domain/models';

function protectSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown): string {
  const normalized = protectSpreadsheetCell(value == null ? '' : String(value));
  return `"${normalized.replaceAll('"', '""')}"`;
}

function entriesToCsv(entries: DailyEntry[]): string {
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

async function saveAndShare(name: string, content: string, mimeType: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
    return name;
  }
  const uri = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Cykla-Export teilen' });
  }
  return uri;
}

export async function exportJson(entries: DailyEntry[], settings: AppSettings): Promise<string> {
  const payload = {
    format: 'cykla-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    notice: 'Enthält dokumentierte Daten. Prognosen werden nicht exportiert oder gespeichert.',
    settings: {
      goal: settings.goal,
      typicalCycleLength: settings.typicalCycleLength,
      typicalPeriodLength: settings.typicalPeriodLength,
    },
    entries,
  };
  return saveAndShare(
    `cykla-export-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  );
}

export async function exportCsv(entries: DailyEntry[]): Promise<string> {
  return saveAndShare(
    `cykla-export-${new Date().toISOString().slice(0, 10)}.csv`,
    entriesToCsv(entries),
    'text/csv',
  );
}
