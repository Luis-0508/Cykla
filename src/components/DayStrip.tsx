import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { addDays, differenceInDays, eachDay, parseDateOnly, todayDate } from '@/domain/dateOnly';
import type { DailyEntry } from '@/domain/models';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';
import { SCREEN_GUTTER } from '@/components/ui/AppScreen';
import { Typography } from '@/components/ui/Typography';

const DAY_WIDTH = 58;
const DAY_STEP = DAY_WIDTH + spacing.sm;
// Days always shown after today or the selected day, whichever is later.
const DAYS_AFTER = 5;
// Earlier days are added in pages once the strip scrolls near its start.
const PAGE_DAYS = 60;
const LOAD_MORE_DAYS = 10;

// Layout effects run before paint; without a DOM (server rendering) fall back to useEffect.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Scroll offset that centres the day at `index` in a strip of the given width. */
export function selectedDayOffset(viewportWidth: number, index: number): number {
  const center = index * DAY_STEP + DAY_WIDTH / 2;
  return Math.max(0, Math.round(center - viewportWidth / 2));
}

type DayStripProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  entries: DailyEntry[];
};

export function DayStrip({ selectedDate, onSelect, entries }: DayStripProps) {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
  const today = todayDate();
  // The strip runs from firstDate up to a few days past today, or past a later selection.
  const [firstDate, setFirstDate] = useState(() =>
    addDays(selectedDate < today ? selectedDate : today, -PAGE_DAYS),
  );
  // A day chosen elsewhere (the calendar) may lie before the rendered range.
  if (differenceInDays(selectedDate, firstDate) < LOAD_MORE_DAYS) {
    setFirstDate(addDays(selectedDate, -PAGE_DAYS));
  }
  const days = eachDay(firstDate, addDays(selectedDate > today ? selectedDate : today, DAYS_AFTER));
  const selectedIndex = differenceInDays(selectedDate, firstDate);
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
  const scrollRef = useRef<ScrollViewInstance>(null);
  // The selected day starts off-screen on narrow phones. The offset must be known before
  // the first frame, which comes before onLayout: until measured, the strip spans the
  // window inside the screen gutter.
  const windowWidth = useWindowDimensions().width;
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const viewportWidth = measuredWidth ?? windowWidth - 2 * SCREEN_GUTTER;
  const offsetX = selectedDayOffset(viewportWidth, selectedIndex);
  // The label names the month of the day in the middle of the strip, as "YYYY-MM".
  const [shownMonth, setShownMonth] = useState(selectedDate.slice(0, 7));
  const [initialOffsetX] = useState(offsetX);
  // What the strip showed after the last commit, to tell a new selection from new pages.
  const shown = useRef({ selectedDate: '', viewportWidth: 0, firstDate, scrollX: 0 });
  const scrollTo = (x: number) => {
    shown.current.scrollX = x;
    scrollRef.current?.scrollTo({ x, animated: false });
  };
  // contentOffset positions native views at mount; web ignores it, so scroll before paint.
  useIsomorphicLayoutEffect(() => {
    const previous = shown.current;
    if (previous.selectedDate !== selectedDate || previous.viewportWidth !== viewportWidth) {
      scrollTo(offsetX);
      setShownMonth(selectedDate.slice(0, 7));
    } else if (previous.firstDate !== firstDate) {
      // Earlier days were prepended: keep the visible days where they were.
      scrollTo(previous.scrollX + differenceInDays(previous.firstDate, firstDate) * DAY_STEP);
    }
    Object.assign(shown.current, { selectedDate, viewportWidth, firstDate });
  });
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    shown.current.scrollX = x;
    const middle = Math.round((x + viewportWidth / 2 - DAY_WIDTH / 2) / DAY_STEP);
    const middleDate = days[Math.min(Math.max(middle, 0), days.length - 1)];
    if (middleDate) setShownMonth(middleDate.slice(0, 7));
    if (x < LOAD_MORE_DAYS * DAY_STEP) {
      // Scroll events can arrive before the new page renders; add each page only once.
      setFirstDate((current) => (current === firstDate ? addDays(current, -PAGE_DAYS) : current));
    }
  };
  return (
    <View>
      <Typography variant="caption" muted style={styles.monthLabel}>
        {formatDate(`${shownMonth}-01`, { month: 'long', year: 'numeric' })}
      </Typography>
      <ScrollView
        ref={scrollRef}
        contentOffset={{ x: initialOffsetX, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {days.map((date) => {
          const value = parseDateOnly(date);
          const selected = date === selectedDate;
          const entry = entryMap.get(date);
          // Days without a saved entry are unknown, not bleeding days.
          const hasBleeding = entry != null && entry.flow !== 'none';
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={formatDate(date)}
              accessibilityHint={
                hasBleeding
                  ? t.dayStrip.periodHint
                  : entry
                    ? t.dayStrip.entryHint
                    : t.dayStrip.selectHint
              }
              style={[
                styles.day,
                {
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  borderColor: isToday ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Typography
                variant="caption"
                style={selected ? { color: theme.colors.surfaceRaised } : undefined}
              >
                {formatDate(date, { weekday: 'short' })}
              </Typography>
              <Typography
                variant="heading"
                style={selected ? { color: theme.colors.surfaceRaised } : undefined}
              >
                {value.getUTCDate()}
              </Typography>
              <View
                style={[
                  styles.eventDot,
                  {
                    backgroundColor: hasBleeding
                      ? selected
                        ? theme.colors.surfaceRaised
                        : theme.colors.period
                      : entry
                        ? theme.colors.accent
                        : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthLabel: {
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  day: {
    width: DAY_WIDTH,
    minHeight: 76,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    marginTop: 2,
  },
});
