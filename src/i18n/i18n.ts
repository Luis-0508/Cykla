import { formatCalendarDate } from '@/domain/dateOnly';
import { de, type Messages } from './locales/de';
import { en } from './locales/en';

export type { Messages };

// To add a language: create `locales/<code>.ts` typed as `Messages`, register it
// here, and add the code to `supportedLocales` in app.config.ts.
export const LANGUAGES = {
  de: { messages: de, nativeName: 'Deutsch', defaultLocale: 'de-DE' },
  en: { messages: en, nativeName: 'English', defaultLocale: 'en-US' },
} as const satisfies Record<
  string,
  { messages: Messages; nativeName: string; defaultLocale: string }
>;

export type Language = keyof typeof LANGUAGES;
export type LanguagePreference = 'system' | Language;

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as Language[];
export const LANGUAGE_PREFERENCES: readonly LanguagePreference[] = [
  'system',
  ...SUPPORTED_LANGUAGES,
];
// German is the original product language and the fallback for unsupported
// device languages.
export const FALLBACK_LANGUAGE: Language = 'de';

/** Minimal shape of an expo-localization `Locale`, kept here so detection stays pure. */
export type DeviceLocale = { languageCode?: string | null; languageTag: string };

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

function languageOf(locale: DeviceLocale): string {
  return (locale.languageCode ?? locale.languageTag.split('-')[0] ?? '').toLowerCase();
}

/** First supported language in the device's preference order. */
export function detectLanguage(deviceLocales: readonly DeviceLocale[]): Language {
  for (const locale of deviceLocales) {
    const code = languageOf(locale);
    if (isLanguage(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}

/** A manual choice always wins over the device language. */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLocales: readonly DeviceLocale[],
): Language {
  return preference === 'system' ? detectLanguage(deviceLocales) : preference;
}

/**
 * BCP-47 tag used for dates and numbers. Keeps the device region when it speaks
 * the active language (en-GB stays en-GB), otherwise uses the language default.
 */
export function formattingLocale(
  language: Language,
  deviceLocales: readonly DeviceLocale[],
): string {
  const match = deviceLocales.find((locale) => languageOf(locale) === language);
  if (match && isValidIntlLocale(match.languageTag)) return match.languageTag;
  return LANGUAGES[language].defaultLocale;
}

function isValidIntlLocale(tag: string): boolean {
  try {
    new Intl.DateTimeFormat(tag);
    return true;
  } catch {
    return false;
  }
}

export type I18n = {
  preference: LanguagePreference;
  language: Language;
  locale: string;
  t: Messages;
  formatDate: (date: string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  decimalSeparator: string;
};

export function createI18n(
  preference: LanguagePreference,
  deviceLocales: readonly DeviceLocale[],
): I18n {
  const language = resolveLanguage(preference, deviceLocales);
  const locale = formattingLocale(language, deviceLocales);
  const numberFormat = new Intl.NumberFormat(locale);
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    options ? new Intl.NumberFormat(locale, options).format(value) : numberFormat.format(value);
  return {
    preference,
    language,
    locale,
    t: LANGUAGES[language].messages,
    formatDate: (date, options) => formatCalendarDate(date, locale, options),
    formatNumber,
    decimalSeparator: formatNumber(1.5).replace(/\d/g, '') || '.',
  };
}
