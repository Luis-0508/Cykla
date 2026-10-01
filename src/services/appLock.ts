import type { Messages } from '@/i18n/i18n';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const LOCK_KEY = 'cykla.app-lock.enabled';

export async function isAppLockEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await SecureStore.getItemAsync(LOCK_KEY)) === 'true';
  } catch {
    return true; // Fail closed if device storage is temporarily unavailable.
  }
}

export async function canUseAppLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

export async function authenticateApp(text: Messages['lock']): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: text.prompt,
    cancelLabel: text.cancel,
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(LOCK_KEY, String(enabled));
}
