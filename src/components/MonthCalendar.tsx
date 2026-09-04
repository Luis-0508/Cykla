import { Pressable, StyleSheet, View } from 'react-native';
import {
  eachDay,
  formatGermanDate,
  monthGrid,
  parseDateOnly,
  startOfMonth,
  todayDate,
} from '@/domain/dateOnly';
import type { DailyEntry, Prediction } from '@/domain/models';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

type MonthCalendarProps = {
  month: string;
  entries: DailyEntry[];
  prediction: Prediction | null;
  selectedDate?: string;
  onSelect: (date: string) => void;
};

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function MonthCalendar({
  month,
  entries,
  prediction,
  selectedDate,
  onSelect,
}: MonthCalendarProps) {
  const theme = useCyklaTheme();
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
    prediction ? eachDay(prediction.fertileWindowStart, prediction.fertileWindowEnd) : [],
  );
  const currentMonth = startOfMonth(month).slice(0, 7);

  return (
    <View>
      <View style={styles.weekRow}>
        {weekdays.map((weekday) => (
          <Typography key={weekday} variant="caption" muted style={styles.weekday}>
            {weekday}
          </Typography>
        ))}
      </View>
      <View style={styles.grid}>
        {monthGrid(month).map((date) => {
          const dateValue = parseDateOnly(date);
          const inMonth = date.slice(0, 7) === currentMonth;
          const isActual = actual.has(date);
          const isPredicted = !isActual && predicted.has(date);
          const isFertile = !isActual && fertile.has(date);
          const isSelected = selectedDate === date;
          const accessibilityParts = [
            formatGermanDate(date),
            isActual ? 'dokumentierter Periodentag' : '',
            isPredicted ? 'möglicher Prognosezeitraum' : '',
            isFertile ? 'möglicher fruchtbarer Zeitraum' : '',
            symptomDays.has(date) ? 'Symptome dokumentiert' : '',
          ].filter(Boolean);
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={accessibilityParts.join(', ')}
              onPress={() => onSelect(date)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dayCircle,
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
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 51,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 39,
    height: 39,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginTop: 1,
  },
});
