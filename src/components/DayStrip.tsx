import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {\n  Pressable,\n  ScrollView,\n  type ScrollViewInstance,\n  StyleSheet,\n  useWindowDimensions,\n  View,\n} from 'react-native';
import { addDays, parseDateOnly, todayDate } from '@/domain/dateOnly';
import type { DailyEntry } from '@/domain/models';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';
import { SCREEN_GUTTER } from '@/components/ui/AppScreen';
import { Typography } from '@/components/ui/Typography';

const DAY_WIDTH = 58;
const DAYS_BEFORE = 5;

// Layout effects run before paint; without a DOM (server rendering) fall back to useEffect.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Scroll offset that centres the selected (middle) day in a strip of the given width. */
export function selectedDayOffset(viewportWidth: number): number {
  const center = DAYS_BEFORE * (DAY_WIDTH + spacing.sm) + DAY_WIDTH / 2;
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
  const days = Array.from({ length: DAYS_BEFORE * 2 + 1 }, (_, index) =>
    addDays(selectedDate, index - DAYS_BEFORE),
  );
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
  const scrollRef = useRef<ScrollViewInstance>(null);
  // The selected day sits in the middle of the strip, which starts off-screen on narrow
  // phones. The offset must be known before the first frame, which comes before
  // onLayout: until measured, the strip spans the window inside the screen gutter.
  const windowWidth = useWindowDimensions().width;
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const offsetX = selectedDayOffset(measuredWidth ?? windowWidth - 2 * SCREEN_GUTTER);
  // contentOffset positions native views at mount; web ignores it, so scroll before paint.
  useIsomorphicLayoutEffect(() => {
    scrollRef.current?.scrollTo({ x: offsetX, animated: false });
  }, [selectedDate, offsetX]);
  return (
    <View>
      <Typography variant="caption" muted style={styles.monthLabel}>
        {formatDate(selectedDate, { month: 'long', year: 'numeric' })}
      </Typography>
      <ScrollView
        ref={scrollRef}
        contentOffset={{ x: offsetX, y: 0 }}
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
          const isToday = date === todayDate();
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
