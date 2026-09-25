import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { addDays, formatGermanDate, parseDateOnly, todayDate } from '@/domain/dateOnly';
import type { DailyEntry } from '@/domain/models';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

type DayStripProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  entries: DailyEntry[];
};

export function DayStrip({ selectedDate, onSelect, entries }: DayStripProps) {
  const theme = useCyklaTheme();
  const days = Array.from({ length: 11 }, (_, index) => addDays(selectedDate, index - 5));
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
  return (
    <View>
      <Typography variant="caption" muted style={styles.monthLabel}>
        {formatGermanDate(selectedDate, { month: 'long', year: 'numeric' })}
      </Typography>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {days.map((date) => {
          const value = parseDateOnly(date);
          const selected = date === selectedDate;
          const entry = entryMap.get(date);
          const isToday = date === todayDate();
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={formatGermanDate(date)}
              accessibilityHint={
                entry
                  ? entry.flow !== 'none'
                    ? 'Dokumentierte Blutung'
                    : 'Eintrag vorhanden'
                  : 'Tag auswählen'
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
                {new Intl.DateTimeFormat('de-DE', {
                  timeZone: 'UTC',
                  weekday: 'short',
                }).format(value)}
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
                    backgroundColor:
                      entry && entry.flow !== 'none'
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
    width: 58,
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
