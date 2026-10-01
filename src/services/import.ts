import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { BackupData } from '@/database/repository';
import { BackupError, MAX_BACKUP_BYTES, parseBackup } from './backup';

/**
 * Lets the user pick a local Cykla JSON export and validates it. Returns null when
 * the picker is canceled. Nothing is written and no file leaves the device.
 */
export async function chooseBackup(): Promise<BackupData | null> {
  if (Platform.OS === 'web') throw new Error('Backup import is only available in the mobile app');
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain'] });
  if (picked.canceled) return null;
  if (picked.result.size > MAX_BACKUP_BYTES) throw new BackupError('tooLarge');
  return parseBackup(await picked.result.text());
}
