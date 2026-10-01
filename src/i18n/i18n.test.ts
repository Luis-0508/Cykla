import { describe, expect, it } from 'vitest';
import {
  createI18n,
  detectLanguage,
  formattingLocale,
  LANGUAGES,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
  type DeviceLocale,
} from './i18n';
import { de } from './locales/de';
import { en } from './locales/en';

const locale = (languageTag: string): DeviceLocale => ({
  languageTag,
  languageCode: languageTag.split('-')[0]!,
});

describe('device language detection', () => {
  it('uses the first supported device language in preference order', () => {
    expect(detectLanguage([locale('de-AT')])).toBe('de');
    expect(detectLanguage([locale('en-GB')])).toBe('en');
    expect(detectLanguage([locale('fr-FR'), locale('en-US'), locale('de-DE')])).toBe('en');
  });
  it('falls back to German for unsupported or missing device languages', () => {
    expect(detectLanguage([locale('fr-FR')])).toBe('de');
    expect(detectLanguage([])).toBe('de');
  });
  it('derives the language from the tag when no language code is reported', () => {
    expect(detectLanguage([{ languageTag: 'EN-us', languageCode: null }])).toBe('en');
  });
});

describe('language preference', () => {
  it('follows the device in automatic mode', () => {
    expect(resolveLanguage('system', [locale('en-US')])).toBe('en');
    expect(resolveLanguage('system', [locale('de-DE')])).toBe('de');
  });
  it('lets a manual choice override the device language', () => {
    expect(resolveLanguage('de', [locale('en-US')])).toBe('de');
    expect(resolveLanguage('en', [locale('de-DE')])).toBe('en');
  });
});

describe('formatting locale', () => {
  it('keeps the device region when it matches the active language', () => {
    expect(formattingLocale('en', [locale('en-GB')])).toBe('en-GB');
    expect(formattingLocale('de', [locale('fr-FR'), locale('de-CH')])).toBe('de-CH');
  });
  it('uses the language default when the device speaks another language', () => {
    expect(formattingLocale('en', [locale('de-DE')])).toBe('en-US');
    expect(formattingLocale('de', [locale('en-US')])).toBe('de-DE');
  });
});

describe('localized formatting', () => {
  it('formats dates, numbers and decimal separators per language', () => {
    const german = createI18n('de', [locale('de-DE')]);
    const english = createI18n('en', [locale('de-DE')]);
    expect(german.formatDate('2026-03-01')).toBe('1. März 2026');
    expect(english.formatDate('2026-03-01')).toBe('March 1, 2026');
    expect(german.formatNumber(7.5)).toBe('7,5');
    expect(english.formatNumber(7.5)).toBe('7.5');
    expect(german.decimalSeparator).toBe(',');
    expect(english.decimalSeparator).toBe('.');
  });
  it('exposes the catalog of the resolved language', () => {
    expect(createI18n('system', [locale('en-AU')]).t).toBe(en);
    expect(createI18n('de', [locale('en-AU')]).t).toBe(de);
  });
});

type Tree = { [key: string]: unknown };

// Calls every message with sample arguments so templates and plurals are exercised.
function flatten(tree: Tree, prefix = ''): Map<string, unknown> {
  const result = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'function') {
      for (const count of [0, 1, 2]) {
        const args = Array.from({ length: value.length }, (_, index) =>
          index === 0 ? count : 'X',
        );
        let output: unknown;
        try {
          output = value(...args);
        } catch {
          // Message takes text, not a count.
          output = value(...args.map(() => `Label ${count}`));
        }
        result.set(`${path}(${count})`, output);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => result.set(`${path}[${index}]`, item));
    } else if (value && typeof value === 'object') {
      flatten(value as Tree, path).forEach((item, itemKey) => result.set(itemKey, item));
    } else {
      result.set(path, value);
    }
  }
  return result;
}

describe('translation catalogs', () => {
  const reference = flatten(de);

  it.each(SUPPORTED_LANGUAGES)('%s defines exactly the reference keys', (language) => {
    const messages = flatten(LANGUAGES[language].messages);
    expect([...messages.keys()].sort()).toEqual([...reference.keys()].sort());
  });

  it.each(SUPPORTED_LANGUAGES)('%s has no empty or unresolved messages', (language) => {
    for (const [key, value] of flatten(LANGUAGES[language].messages)) {
      expect(typeof value, key).toBe('string');
      expect((value as string).trim(), key).not.toBe('');
      expect(value, key).not.toMatch(/undefined|NaN|\$\{/);
    }
  });

  it('contains no German leftovers in English', () => {
    for (const [key, value] of flatten(en)) {
      expect(value, key).not.toMatch(/[äöüÄÖÜß„]/);
    }
  });

  it('uses singular and plural forms', () => {
    expect(de.common.dayCount(1)).toBe('1 Tag');
    expect(de.common.dayCount(5)).toBe('5 Tage');
    expect(en.common.dayCount(1)).toBe('1 day');
    expect(en.common.dayCount(5)).toBe('5 days');
    expect(de.today.aboutInDays(1)).toBe('ungefähr in 1 Tag');
    expect(de.today.aboutInDays(3)).toBe('ungefähr in 3 Tagen');
    expect(en.today.aboutInDays(1)).toBe('in about 1 day');
    expect(de.calendar.symptomCount(1)).toBe('1 Symptom');
    expect(en.calendar.symptomCount(2)).toBe('2 symptoms');
    expect(de.settings.documentedDays(1)).toBe('1 dokumentierter Tag auf diesem Gerät');
    expect(en.settings.documentedDays(0)).toBe('0 days logged on this device');
  });

  it('keeps the original German estimate explanation', () => {
    expect(de.estimate.explanation(1)).toBe(
      'Bisher liegt 1 vollständiger Zyklus vor. Deshalb ist der Zeitraum bewusst weiter gefasst.',
    );
    expect(de.estimate.explanation(4)).toBe(
      'Die Schätzung nutzt 4 vollständige Zyklen. Neuere Zyklen zählen etwas stärker; auffällige Abweichungen etwas schwächer.',
    );
  });

  it('provides seven Monday-first weekday labels', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(LANGUAGES[language].messages.calendar.weekdays).toHaveLength(7);
    }
    expect(en.calendar.weekdays[0]).toBe('Mon');
  });
});
