import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from './testing/sqlite';
import { initializeDatabase } from './schema';
import { saveDailyEntry, setSetting, type SaveDailyEntryInput } from './repository';
import { createI18n, type Language } from '@/i18n/i18n';
import DayEditorScreen from '../../app/day/[date]';
import EntryRoute from '../../app/index';

const environment = vi.hoisted(() => ({
  db: null as import('expo-sqlite').SQLiteDatabase | null,
  date: '2026-01-01',
  theme: 'light',
}));
vi.mock('expo-sqlite', () => ({ useSQLiteContext: () => environment.db }));
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'web' },
  StyleSheet: { create: (styles: unknown) => styles },
  useColorScheme: () => environment.theme,
  Alert: { alert: vi.fn() },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ date: environment.date }),
  router: { back: vi.fn() },
  Redirect: (props: { href: string }) => createElement('Redirect', props),
}));
let i18n = createI18n('de', []);
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => i18n }));

const input: SaveDailyEntryInput = {
  date: '2026-01-01',
  flow: 'heavy',
  mood: 'happy',
  pain: 6,
  energy: 4,
  sleepHours: 7.5,
  sleepQuality: 3,
  notes: 'Synthetic existing note',
  symptoms: [
    { code: 'cramps', intensity: 2 },
    { code: 'headache', intensity: 1 },
  ],
};

describe('read failures with real queries, forms and SQLite', () => {
  let test: ReturnType<typeof createTestDatabase>;
  let client: QueryClient;
  let screen: ReactTestRenderer;
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    // React 19 still supports this renderer; hide only its deprecation notice.
    const error = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
      error(...args);
    });
    test = createTestDatabase();
    await initializeDatabase(test.db);
    environment.db = test.db;
    environment.date = input.date;
    environment.theme = 'light';
    i18n = createI18n('de', []);
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
    });
  });
  afterEach(async () => {
    await act(async () => {
      screen?.unmount();
    });
    client.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    test.close();
  });

  async function mount(component: typeof DayEditorScreen | typeof EntryRoute) {
    await act(async () => {
      screen = create(createElement(QueryClientProvider, { client }, createElement(component)));
    });
  }
  async function until(assertion: () => void) {
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      assertion();
    });
  }
  function buttons(label: string) {
    return screen.root.findAll(
      (node) => String(node.type) === 'Pressable' && node.props.accessibilityLabel === label,
    );
  }
  async function stored() {
    return {
      entries: await test.db.getAllAsync('SELECT * FROM daily_entries ORDER BY date'),
      symptoms: await test.db.getAllAsync('SELECT * FROM symptom_entries ORDER BY id'),
    };
  }
  function expectExistingForm() {
    expect(buttons(i18n.t.dayEditor.save)).toHaveLength(1);
    const fields = screen.root.findAll((node) => String(node.type) === 'TextInput');
    expect(
      fields.find((field) => field.props.accessibilityLabel === i18n.t.dayEditor.noteLabel)?.props
        .value,
    ).toBe(input.notes);
    expect(
      fields.find((field) => field.props.accessibilityLabel === i18n.t.dayEditor.sleepHoursLabel)
        ?.props.value,
    ).toBe(String(input.sleepHours).replace('.', i18n.decimalSeparator));
    for (const label of [
      i18n.t.flowOption.heavy,
      i18n.t.mood.happy,
      i18n.t.symptom.cramps,
      i18n.t.symptom.headache,
      i18n.t.dayEditor.scaleValue(i18n.t.dayEditor.painLabel, 6),
      i18n.t.dayEditor.scaleValue(i18n.t.category.energy, 4),
      i18n.t.dayEditor.scaleValue(i18n.t.dayEditor.sleepQuality, 3),
    ]) {
      expect(buttons(label)[0]?.props.accessibilityState.selected).toBe(true);
    }
  }

  it.each<[Language, string]>([
    ['de', 'light'],
    ['de', 'dark'],
    ['en', 'light'],
    ['en', 'dark'],
  ])(
    'blocks editing after a failed read and retries the actual stored entry (%s, %s)',
    async (language, theme) => {
      i18n = createI18n(language, []);
      environment.theme = theme;
      await saveDailyEntry(test.db, input);
      const before = await stored();
      vi.spyOn(test.db, 'getFirstAsync').mockRejectedValueOnce(new Error('synthetic read failure'));
      await mount(DayEditorScreen);
      await until(() => expect(buttons(i18n.t.common.retry)).toHaveLength(1));
      expect(JSON.stringify(screen.toJSON())).toContain(i18n.t.dayEditor.loadError);
      expect(buttons(i18n.t.dayEditor.save)).toHaveLength(0);
      expect(buttons(i18n.t.dayEditor.deleteDay)).toHaveLength(0);
      expect(screen.root.findAll((node) => String(node.type) === 'TextInput')).toHaveLength(0);
      expect(await stored()).toEqual(before);
      await act(async () => {
        buttons(i18n.t.common.retry)[0]!.props.onPress();
      });
      await until(expectExistingForm);
      expect(await stored()).toEqual(before);
    },
  );

  it('blocks the form after a failed refetch even when cached data exists', async () => {
    await saveDailyEntry(test.db, input);
    await mount(DayEditorScreen);
    await until(expectExistingForm);
    vi.spyOn(test.db, 'getFirstAsync').mockRejectedValueOnce(
      new Error('synthetic refetch failure'),
    );
    await act(async () => {
      await client.refetchQueries({ queryKey: ['entry', input.date] });
    });
    await until(() => expect(buttons(i18n.t.common.retry)).toHaveLength(1));
    expect(buttons(i18n.t.dayEditor.save)).toHaveLength(0);
    await act(async () => {
      buttons(i18n.t.common.retry)[0]!.props.onPress();
    });
    await until(expectExistingForm);
  });

  it('initializes defaults only after a successful read confirms that the day is absent', async () => {
    await mount(DayEditorScreen);
    await until(() => expect(buttons(i18n.t.dayEditor.save)).toHaveLength(1));
    expect(buttons(i18n.t.flowOption.none)[0]!.props.accessibilityState.selected).toBe(true);
    expect(buttons(i18n.t.dayEditor.deleteDay)).toHaveLength(0);
  });

  it.each([true, false])(
    'does not interpret settings read failure as incomplete onboarding (completed=%s)',
    async (completed) => {
      await setSetting(test.db, 'onboardingCompleted', completed);
      const before = await test.db.getAllAsync('SELECT * FROM app_settings');
      vi.spyOn(test.db, 'getAllAsync').mockRejectedValueOnce(
        new Error('synthetic settings read failure'),
      );
      await mount(EntryRoute);
      await until(() => expect(buttons(i18n.t.common.retry)).toHaveLength(1));
      expect(JSON.stringify(screen.toJSON())).toContain(i18n.t.states.prepareError);
      expect(screen.root.findAll((node) => String(node.type) === 'Redirect')).toHaveLength(0);
      expect(await test.db.getAllAsync('SELECT * FROM app_settings')).toEqual(before);
      await act(async () => {
        buttons(i18n.t.common.retry)[0]!.props.onPress();
      });
      await until(() =>
        expect(screen.root.findAll((node) => String(node.type) === 'Redirect')[0]?.props.href).toBe(
          completed ? '/(tabs)' : '/onboarding',
        ),
      );
    },
  );
});
