import { de } from '@/i18n/de';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppSettings, DailyEntry } from '@/domain/models';

import { entriesToCsv, entriesToJson } from './exportSerialization';

async function saveAndShare(name: string, content: string, mimeType: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    try {
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    return name;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is unavailable');
  }
  // Dedicated per-export directory avoids collisions between simultaneous shares.
  const directory = FileSystem.cacheDirectory + 'cykla-exports/';
  const folder = directory + Date.now() + '-' + Math.random().toString(36).slice(2) + '/';
  const uri = folder + name;
  let shareStarted = false;
  try {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    shareStarted = true;
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: de.settings.shareExport });
    return name;
  } finally {
    // Android's activity result does not mean the recipient has finished reading.
    // Retain handed-off files even on rejection/cancellation: Expo cannot reliably
    // distinguish these outcomes. Unknown native platforms defer cleanup too.
    // iOS uses UIActivityViewController's completion callback.
    if (!shareStarted || Platform.OS === 'ios') {
      await FileSystem.deleteAsync(folder, { idempotent: true });
    }
  }
}

export async function exportJson(entries: DailyEntry[], settings: AppSettings): Promise<string> {
  return saveAndShare(
    `cykla-export-${new Date().toISOString().slice(0, 10)}.json`,
    entriesToJson(entries, settings),
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

// Cold-start cleanup of prior-session exports, before screens create new ones.
// Never invoke on foreground/AppState changes: recipients may still need the URI.
// Failed deletion is retried by the caller on a later launch; the OS may evict cache.
export async function cleanupTemporaryExports(): Promise<void> {
  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) return;
  await FileSystem.deleteAsync(FileSystem.cacheDirectory + 'cykla-exports/', { idempotent: true });
}
