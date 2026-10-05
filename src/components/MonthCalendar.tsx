import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { eachDay, monthWeeks, parseDateOnly, startOfMonth, todayDate } from '@/domain/dateOnly';
import type { DailyEntry, Prediction } from '@/domain/models';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme, WIDE_LAYOUT_MIN_WIDTH } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

type MonthCalendarProps = {
  month: string;
  entries: DailyEntry[];
  prediction: Prediction | null;
  selectedDate?: string;
  onSelect: (date: string) => void;
};

export function MonthCalendar({
  month,
  entries,
  prediction,
  selectedDate,
  onSelect,
}: MonthCalendarProps) {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
  const wide = useWindowDimensions().width >= WIDE_LAYOUT_MIN_WIDTH;
  const actual = new Set(
    entries.filter((entry) => entry.flow !== 'none').map((entry) => entry.date),
  );
  const symptomDays = new Set(
    entries.filter((entry) => entry.symptoms.length > 0).map((entry) => entry.date),
  );
  const predicted = new Set(
    prediction ? eachDay(prediction.windowStart, prediction.windowEnd) : [],
  );
  const fertile = new Set(
    prediction?.fertileWindowStart && prediction.fertileWindowEnd
      ? eachDay(prediction.fertileWindowStart, prediction.fertileWindowEnd)
      : [],
  );
  const currentMonth = startOfMonth(month).slice(0, 7);

  // Explicit week rows of seven flex columns: a day can never wrap into the next week,
  // unlike a wrapping grid of 1/7-width cells, which Yoga rounds into six columns on iOS.
  return (
    <View>
      <View testID="calendar-weekdays" style={[styles.row, styles.weekdays]}>
        {t.calendar.weekdays.map((weekday) => (
          <View key={weekday} style={styles.column}>
            <Typography variant="caption" muted style={styles.weekday}>
              {weekday}
            </Typography>
          </View>
        ))}
      </View>
      {monthWeeks(month).map((week, index) => (
        <View key={week[0]} testID={`calendar-week-${index}`} style={styles.row}>
          {week.map((date) => {
            const dateValue = parseDateOnly(date);
            const inMonth = date.slice(0, 7) === currentMonth;
            const isActual = actual.has(date);
            const isPredicted = !isActual && predicted.has(date);
            const isFertile = !isActual && fertile.has(date);
            const isSelected = selectedDate === date;
            const accessibilityParts = [
              formatDate(date),
              isActual ? t.calendar.a11yPeriod : '',
              isPredicted ? t.calendar.a11yPrediction : '',
              isFertile ? t.calendar.a11yFertile : '',
              symptomDays.has(date) ? t.calendar.a11ySymptoms : '',
            ].filter(Boolean);
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={accessibilityParts.join(', ')}
                onPress={() => onSelect(date)}
                style={[styles.column, styles.cell, wide && styles.cellWide]}
              >
                <View
                  style={[
                    styles.dayCircle,
                    wide && styles.dayCircleWide,
                    isActual && { backgroundColor: theme.colors.period },
                    isPredicted && {
                      borderColor: theme.colors.period,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                    },
                    isFertile &&
                      !isPredicted && {
                        backgroundColor: theme.colors.fertileSoft,
                      },
                    isSelected && {
                      borderColor: theme.colors.accent,
                      borderWidth: 2,
                    },
                    date === todayDate() &&
                      !isSelected && {
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                  ]}
                >
                  <Typography
                    variant="label"
                    muted={!inMonth}
                    style={isActual ? { color: '#FFFFFF' } : undefined}
                  >
                    {dateValue.getUTCDate()}
                  </Typography>
                </View>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: symptomDays.has(date) ? theme.colors.accent : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // No flexWrap: every row holds exactly its seven columns.
  row: {
    flexDirection: 'row',
  },
  weekdays: {
    paddingBottom: spacing.xs,
  },
  column: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  weekday: {
    textAlign: 'center',
  },
  // 44 pt keeps the minimum touch target while six rows stay compact on phones.
  cell: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cellWide: {
    minHeight: 52,
  },
  // Explicit equal dimensions avoid percentage/aspect-ratio stretching in native Yoga.
  // The marker is separate from the larger touchable flex column.
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleWide: {
    width: 42,
    height: 42,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 4,
    marginTop: 2,
  },
});
