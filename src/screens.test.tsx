import { createElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '@/database/testing/sqlite';
import { initializeDatabase } from '@/database/schema';
import { saveDailyEntry } from '@/database/repository';
import { addDays } from '@/domain/dateOnly';
import { createI18n } from '@/i18n/i18n';
import { useUiStore } from '@/store/uiStore';
import { selectedDayOffset } from '@/components/DayStrip';
import { SCREEN_GUTTER } from '@/components/ui/AppScreen';
import PredictionScreen from '../app/prediction';
import TodayScreen from '../app/(tabs)/index';
import CalendarScreen from '../app/(tabs)/calendar';
import InsightsScreen from '../app/(tabs)/insights';
import DayEditorScreen from '../app/day/[date]';

const environment = vi.hoisted(() => ({
  db: null as import('expo-sqlite').SQLiteDatabase | null,
  width: 390,
  date: '2026-08-24',
  canGoBack: true,
  alerts: [] as { text?: string; onPress?: () => void }[][],
  appState: new Set<(state: string) => void>(),
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
  Platform: { OS: 'ios' },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  useColorScheme: () => 'dark',
  useWindowDimensions: () => ({ width: environment.width, height: 800, fontScale: 1, scale: 3 }),
  AppState: {
    addEventListener: (_type: string, listener: (state: string) => void) => {
      environment.appState.add(listener);
      return { remove: () => environment.appState.delete(listener) };
    },
  },
  Alert: {
    alert: (_title: string, _body: string, buttons: { text?: string; onPress?: () => void }[]) =>
      environment.alerts.push(buttons),
  },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
const router = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  canGoBack: vi.fn(),
}));
vi.mock('expo-router', () => ({
  router,
  useLocalSearchParams: () => ({ date: environment.date }),
}));
const i18n = createI18n('de', []);
const english = createI18n('en', []);
let activeI18n = i18n;
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => activeI18n }));
const t = i18n.t;

// Synthetic five-day periods; never real health data.
async function recordPeriods(db: import('expo-sqlite').SQLiteDatabase, ...starts: string[]) {
  for (const start of starts) {
    for (let day = 0; day < 5; day++) {
      await saveDailyEntry(db, {
        date: addDays(start, day),
        flow: 'medium',
        mood: null,
        pain: null,
        energy: null,
        sleepHours: null,
        sleepQuality: null,
        notes: '',
        symptoms: [],
      });
    }
  }
}

describe('screens with real SQLite data', () => {
  let test: ReturnType<typeof createTestDatabase>;
  let client: QueryClient;
  let screen: ReactTestRenderer;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const error = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
      error(...args);
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    test = createTestDatabase();
    await initializeDatabase(test.db);
    environment.db = test.db;
    environment.width = 390;
    activeI18n = i18n;
    environment.canGoBack = true;
    environment.alerts = [];
    router.canGoBack.mockImplementation(() => environment.canGoBack);
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
    });
  });
  afterEach(async () => {
    await act(async () => {
      screen?.unmount();
    });
    client.clear();
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    test.close();
  });

  function setToday(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    vi.setSystemTime(new Date(year!, month! - 1, day!, 12));
    useUiStore.setState({ selectedDate: date });
  }
  async function mount(component: () => React.ReactNode) {
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
      // Below vitest's 5 s test timeout, so a failure still reports and cleans up.
    }, 3_000);
  }
  const texts = () =>
    screen.root
      .findAll((node) => String(node.type) === 'Text')
      .map((node) => [node.props.children].flat().join(''));
  const findText = (value: string) =>
    screen.root.findAll(
      (node) => String(node.type) === 'Text' && [node.props.children].flat().join('') === value,
    );
  const buttons = (label: string) =>
    screen.root.findAll(
      (node) => String(node.type) === 'Pressable' && node.props.accessibilityLabel === label,
    );
  const hostViews = (node: ReactTestInstance) => {
    const views: ReactTestInstance[] = [];
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (String(parent.type) === 'View') views.push(parent);
    }
    return views;
  };
  const flatStyle = (node: ReactTestInstance) =>
    Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));

  describe('Today', () => {
    it('shows a wide range instead of an 80-day countdown after missing months', async () => {
      await recordPeriods(test.db, '2026-06-01', '2026-08-24');
      setToday('2026-08-30');
      await mount(TodayScreen);
      // Before the fix the 84-day gap was used as the cycle length: "in about 78 days".
      const short = (date: string) => i18n.formatDate(date, { day: 'numeric', month: 'short' });
      await until(() =>
        expect(findText(t.estimate.range(short('2026-09-14'), short('2026-11-23')))).toHaveLength(
          1,
        ),
      );
      expect(texts().some((text) => text.startsWith('ungefähr'))).toBe(false);
    });

    it('asks for a new entry instead of counting when the estimate is stale', async () => {
      await recordPeriods(test.db, '2026-05-04', '2026-06-01');
      setToday('2026-10-03');
      await mount(TodayScreen);
      await until(() => expect(findText(t.today.laterThanEstimated)).toHaveLength(1));
      expect(findText(t.estimate.overdueBody('4. Juli'))).toHaveLength(1);
      expect(texts().some((text) => text.startsWith('ungefähr'))).toBe(false);
      expect(findText(t.confidence.low)).toHaveLength(0);
    });

    it('shows the cycle day for a past day instead of a countdown', async () => {
      await recordPeriods(test.db, '2026-06-01', '2026-06-29', '2026-07-27');
      setToday('2026-08-01');
      useUiStore.setState({ selectedDate: '2026-06-10' });
      await mount(TodayScreen);
      await until(() => expect(findText(t.today.cycleDay(10))).toHaveLength(1));
      expect(findText(t.today.pastDayBody)).toHaveLength(1);
      expect(texts().some((text) => text.startsWith('ungefähr'))).toBe(false);
    });
  });

  it('keeps Trends consistent with the estimate when an entry is missing', async () => {
    await recordPeriods(test.db, '2026-01-01', '2026-01-29', '2026-02-26', '2026-04-23');
    setToday('2026-04-27');
    await mount(InsightsScreen);
    await until(() => expect(findText(t.insights.likelyMissedPeriod)).toHaveLength(1));
    expect(findText('28')).toHaveLength(1);
    expect(findText(t.insights.fromCycles(2))).toHaveLength(1);
    expect(findText(t.estimate.explanation(2))).toHaveLength(1);
  });

  describe('Estimate explanation', () => {
    it('turns overdue when an open screen resumes on the next day', async () => {
      await recordPeriods(test.db, '2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26');
      // Three steady cycles: 2026-04-23 ±3 days, so the window ends on 2026-04-26.
      setToday('2026-04-26');
      await mount(PredictionScreen);
      await until(() => expect(findText(t.confidence.medium)).toHaveLength(1));
      expect(findText(t.estimate.overdueTitle)).toHaveLength(0);
      // Backgrounded overnight, then brought back without remounting.
      vi.setSystemTime(new Date(2026, 3, 27, 8));
      await act(async () => environment.appState.forEach((listener) => listener('active')));
      await until(() => expect(findText(t.estimate.overdueTitle)).toHaveLength(1));
      expect(findText(t.confidence.medium)).toHaveLength(0);
    });

    it('does not present an expired window as a current, confident estimate', async () => {
      // Six steady cycles would earn high confidence if the window were still current.
      await recordPeriods(
        test.db,
        ...Array.from({ length: 7 }, (_, index) => addDays('2026-01-01', index * 28)),
      );
      setToday('2026-10-03');
      await mount(PredictionScreen);
      await until(() => expect(findText(t.estimate.overdueTitle)).toHaveLength(1));
      for (const level of ['low', 'medium', 'high'] as const) {
        expect(findText(t.confidence[level])).toHaveLength(0);
      }
      expect(texts().some((text) => text.startsWith('Der rechnerische Mittelpunkt'))).toBe(false);
      // The fertile range of the expired window is not shown as current either.
      expect(findText(t.prediction.fertileUnavailable)).toHaveLength(1);
    });

    it('explains an uncertain history instead of a precise midpoint', async () => {
      await recordPeriods(test.db, '2026-01-01', '2026-02-26', '2026-04-23');
      setToday('2026-04-28');
      await mount(PredictionScreen);
      await until(() => expect(findText(t.estimate.uncertainBody)).toHaveLength(1));
      expect(findText(t.confidence.low)).toHaveLength(1);
      expect(texts().some((text) => text.startsWith('Der rechnerische Mittelpunkt'))).toBe(false);
    });
  });

  it('shows a wide range on Today for repeated gaps instead of a 56-day countdown', async () => {
    await recordPeriods(test.db, '2026-01-01', '2026-02-26', '2026-04-23');
    setToday('2026-04-28');
    await mount(TodayScreen);
    await until(() => expect(findText(t.estimate.uncertainBody)).toHaveLength(1));
    const short = (date: string) => i18n.formatDate(date, { day: 'numeric', month: 'short' });
    expect(findText(t.estimate.range(short('2026-05-14'), short('2026-06-25')))).toHaveLength(1);
    expect(texts().some((text) => text.startsWith('ungefähr'))).toBe(false);
  });

  describe('Day strip', () => {
    it.each([320, 375, 390, 430])(
      'starts with the selected day centred on a %i pt phone, before any layout event',
      async (width) => {
        environment.width = width;
        setToday('2026-08-30');
        await mount(TodayScreen);
        await until(() => expect(buttons(i18n.formatDate('2026-08-30'))).toHaveLength(1));
        const strip = screen.root.find(
          (node) => String(node.type) === 'ScrollView' && node.props.horizontal,
        );
        const viewport = width - 2 * SCREEN_GUTTER;
        const offset = selectedDayOffset(viewport);
        // Present on the very first render: no onLayout has been delivered here.
        expect(strip.props.contentOffset).toEqual({ x: offset, y: 0 });
        const left = 5 * (58 + 8) - offset;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + 58).toBeLessThanOrEqual(viewport);
        expect(Math.abs(left + 29 - viewport / 2)).toBeLessThanOrEqual(1);
      },
    );
  });

  describe('Calendar layout', () => {
    it.each([320, 375, 390, 430])(
      'gives the month name the width on a %i pt phone',
      async (width) => {
        environment.width = width;
        setToday('2026-09-26');
        await mount(CalendarScreen);
        await until(() => expect(buttons(t.calendar.previous)).toHaveLength(1));
        // Arrows stay reachable by name for screen readers, but no visible label competes.
        expect(findText(t.calendar.previous)).toHaveLength(0);
        expect(findText(t.calendar.next)).toHaveLength(0);
        expect(findText('September 2026')).toHaveLength(1);
      },
    );

    it('keeps text labels on wide layouts', async () => {
      environment.width = 768;
      setToday('2026-09-26');
      await mount(CalendarScreen);
      await until(() => expect(findText(t.calendar.previous)).toHaveLength(1));
      expect(findText(t.calendar.next)).toHaveLength(1);
    });

    const weekRows = () =>
      screen.root
        .findAll(
          (node) =>
            String(node.type) === 'View' && String(node.props.testID).startsWith('calendar-week-'),
        )
        .sort((a, b) => String(a.props.testID).localeCompare(String(b.props.testID)));
    const childViews = (node: ReactTestInstance) =>
      node.children.filter((child): child is ReactTestInstance => typeof child !== 'string');
    const plainStyle = (style: unknown) =>
      Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

    describe.each([
      ['de', i18n],
      ['en', english],
    ] as const)('in %s', (_language, locale) => {
      it.each([320, 375, 390, 393, 430, 768])(
        'renders six rows of exactly seven columns on a %i pt screen',
        async (width) => {
          activeI18n = locale;
          environment.width = width;
          setToday('2026-10-05');
          await mount(CalendarScreen);
          await until(() => expect(weekRows()).toHaveLength(6));
          for (const row of weekRows()) {
            // Explicit rows replace a wrapping grid, which wrapped the seventh day on iOS.
            expect(flatStyle(row).flexDirection).toBe('row');
            expect(flatStyle(row).flexWrap).toBeUndefined();
            const cells = childViews(row);
            expect(cells).toHaveLength(7);
            for (const cell of cells) {
              expect(String(cell.type)).toBe('Pressable');
              expect(flatStyle(cell)).toMatchObject({ flex: 1, minWidth: 0 });
              expect(flatStyle(cell).width).toBeUndefined();
            }
          }
          // The header uses the same seven flex columns as the date rows.
          const header = screen.root.find((node) => node.props.testID === 'calendar-weekdays');
          expect(flatStyle(header)).toMatchObject({ flexDirection: 'row' });
          expect(flatStyle(header).flexWrap).toBeUndefined();
          const columns = childViews(header);
          expect(columns).toHaveLength(7);
          for (const column of columns) {
            expect(flatStyle(column)).toMatchObject({ flex: 1, minWidth: 0 });
            expect(flatStyle(column).width).toBeUndefined();
          }
          expect(
            columns.map((column) =>
              [column.find((node) => String(node.type) === 'Text').props.children].flat().join(''),
            ),
          ).toEqual([...locale.t.calendar.weekdays]);

          const position = (date: string) => {
            const label = locale.formatDate(date);
            for (const [rowIndex, row] of weekRows().entries()) {
              const column = childViews(row).findIndex((cell) =>
                String(cell.props.accessibilityLabel).startsWith(label),
              );
              if (column >= 0) return [rowIndex, column];
            }
            return null;
          };
          expect(locale.t.calendar.weekdays[0]).toBe(locale === english ? 'Mon' : 'Mo');
          expect(locale.t.calendar.weekdays[6]).toBe(locale === english ? 'Sun' : 'So');
          expect(position('2026-09-28')).toEqual([0, 0]);
          expect(position('2026-10-01')).toEqual([0, 3]);
          expect(position('2026-10-03')).toEqual([0, 5]);
          expect(position('2026-10-04')).toEqual([0, 6]);
          expect(position('2026-10-05')).toEqual([1, 0]);
          expect(position('2026-10-31')).toEqual([4, 5]);
          expect(position('2026-11-08')).toEqual([5, 6]);
        },
      );

      it.each([375, 393])(
        'shows only arrow icons in the month controls on a %i pt phone',
        async (width) => {
          activeI18n = locale;
          environment.width = width;
          setToday('2026-10-05');
          await mount(CalendarScreen);
          const tl = locale.t.calendar;
          await until(() => expect(buttons(tl.previous)).toHaveLength(1));
          for (const [label, hint, icon] of [
            [tl.previous, tl.previousMonth, 'chevron-back'],
            [tl.next, tl.nextMonth, 'chevron-forward'],
          ] as const) {
            const control = buttons(label)[0]!;
            expect(control.props.accessibilityRole).toBe('button');
            expect(control.props.accessibilityHint).toBe(hint);
            // No label text is rendered at all, not merely hidden.
            expect(control.findAll((node) => String(node.type) === 'Text')).toHaveLength(0);
            expect(control.find((node) => String(node.type) === 'Icon').props.name).toBe(icon);
            expect(findText(label)).toHaveLength(0);
          }
        },
      );

      it.each([
        [375, 1],
        [393, 1],
        [768, 2],
      ])('keeps every legend symbol beside its own label at %i pt', async (width, perRow) => {
        activeI18n = locale;
        environment.width = width;
        setToday('2026-10-05');
        await mount(CalendarScreen);
        const tl = locale.t.calendar;
        await until(() => expect(findText(tl.legendSymptom)).toHaveLength(1));
        const rows = screen.root.findAll(
          (node) => String(node.type) === 'View' && node.props.testID === 'calendar-legend-row',
        );
        expect(rows).toHaveLength(4 / perRow);
        for (const row of rows) {
          expect(flatStyle(row).flexWrap).toBeUndefined();
          expect(childViews(row)).toHaveLength(perRow);
        }
        for (const label of [
          tl.legendPeriod,
          tl.legendPrediction,
          tl.legendFertile,
          tl.legendSymptom,
        ]) {
          const text = findText(label)[0]!;
          const item = hostViews(text)[0]!;
          // Symbol and label share one row-shaped item; the label wraps beside the symbol.
          expect(flatStyle(item)).toMatchObject({ flexDirection: 'row', flex: 1, minWidth: 0 });
          expect(childViews(item)).toHaveLength(2);
          expect(flatStyle(childViews(item)[0]!).flexShrink).toBe(0);
          expect(flatStyle(text)).toMatchObject({ flex: 1, minWidth: 0 });
        }
      });
    });

    it('keeps the compact calendar short without dropping below 44 pt targets', async () => {
      environment.width = 393;
      setToday('2026-10-05');
      await mount(CalendarScreen);
      await until(() => expect(weekRows()).toHaveLength(6));
      expect(flatStyle(childViews(weekRows()[0]!)[0]!).minHeight).toBe(44);
      const control = buttons(t.calendar.previous)[0]!;
      expect(plainStyle(control.props.style({ pressed: false }))).toMatchObject({
        minWidth: 44,
        minHeight: 44,
      });
      // The tab bar is laid out below the scroll view, so no tab-bar-sized padding is needed.
      const scroll = screen.root.find((node) => String(node.type) === 'ScrollView');
      const content = plainStyle(scroll.props.contentContainerStyle);
      expect(content.paddingBottom).toBeGreaterThanOrEqual(16);
      expect(content.paddingBottom).toBeLessThanOrEqual(32);
    });

    it('lets legend labels and the entry badge wrap inside their containers', async () => {
      await recordPeriods(test.db, '2026-09-22');
      environment.width = 320;
      setToday('2026-09-26');
      await mount(CalendarScreen);
      await until(() => expect(findText(t.calendar.hasEntry)).toHaveLength(1));
      for (const label of [
        t.calendar.legendPeriod,
        t.calendar.legendPrediction,
        t.calendar.legendFertile,
        t.calendar.legendSymptom,
      ]) {
        expect(flatStyle(findText(label)[0]!).flexShrink).toBe(1);
      }
      const badge = findText(t.calendar.hasEntry)[0]!;
      expect(flatStyle(badge).flexShrink).toBe(1);
      const header = hostViews(badge)[1]!;
      expect(flatStyle(header)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
      const dateColumn = hostViews(findText(i18n.formatDate('2026-09-26'))[0]!)[0]!;
      expect(flatStyle(dateColumn).flexShrink).toBe(1);
    });
  });

  describe('Day editor', () => {
    it('reports a failed delete and keeps the editor open', async () => {
      await recordPeriods(test.db, '2026-08-24');
      environment.date = '2026-08-24';
      setToday('2026-08-26');
      await mount(DayEditorScreen);
      await until(() => expect(buttons(t.dayEditor.deleteDay)).toHaveLength(1));
      vi.spyOn(test.db, 'runAsync').mockRejectedValueOnce(new Error('synthetic delete failure'));
      await act(async () => {
        buttons(t.dayEditor.deleteDay)[0]!.props.onPress();
      });
      const confirm = environment.alerts.at(-1)!.find((button) => button.text === t.common.delete);
      await act(async () => {
        confirm!.onPress!();
      });
      await until(() => expect(findText(t.dayEditor.deleteError)).toHaveLength(1));
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(await test.db.getAllAsync('SELECT date FROM daily_entries')).toHaveLength(5);
    });

    it('returns to the tabs when opened without navigation history', async () => {
      environment.date = '2026-08-24';
      environment.canGoBack = false;
      setToday('2026-08-26');
      await mount(DayEditorScreen);
      await until(() => expect(buttons(t.dayEditor.close)).toHaveLength(1));
      await act(async () => {
        buttons(t.dayEditor.close)[0]!.props.onPress();
      });
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
