import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { BackupData } from '@/domain/models';
import { parseBackup } from './backup';

/** A canceled picker leaves the database unchanged. No file is uploaded. */
export async function chooseBackup(): Promise<BackupData | null> {
  if (Platform.OS === 'web') throw new Error('Der Import ist nur in der mobilen App verfügbar.');
  const picked = await File.pickFileAsync({
    multipleFiles: false,
    mimeTypes: 'application/json',
  });
  if (picked.canceled) return null;
  return parseBackup(await picked.result.text());
}
