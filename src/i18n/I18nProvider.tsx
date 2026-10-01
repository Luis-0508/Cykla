import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { useLocales } from 'expo-localization';
import { useSettings } from '@/hooks/useCyklaData';
import { createI18n, type I18n } from './i18n';

const I18nContext = createContext<I18n | null>(null);

/**
 * Resolves the UI language from the stored preference (SQLite `app_settings`)
 * and the device locales. `useLocales` re-renders when the OS language changes,
 * so "system" follows the device while a manual choice stays fixed.
 */
export function I18nProvider({ children }: PropsWithChildren) {
  const settings = useSettings();
  const deviceLocales = useLocales();
  const preference = settings.data?.language ?? 'system';
  const value = useMemo(() => createI18n(preference, deviceLocales), [preference, deviceLocales]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = value.language;
    }
  }, [value.language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
