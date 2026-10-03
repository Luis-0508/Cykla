import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { MonthCalendar } from '@/components/MonthCalendar';
import { addMonths, startOfMonth, todayDate } from '@/domain/dateOnly';
import { usePrediction } from '@/hooks/usePrediction';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme, WIDE_LAYOUT_MIN_WIDTH } from '@/theme/theme';

export default function CalendarScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
  // On phones the month name needs the width; the arrows keep their labels for screen readers.
  const showNavLabels = useWindowDimensions().width >= WIDE_LAYOUT_MIN_WIDTH;
  const [month, setMonth] = useState(startOfMonth(todayDate()));
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const { entries, prediction, isLoading, error } = usePrediction();
  const entry = entries.find((value) => value.date === selectedDate);

  if (isLoading) return <LoadingState label={t.calendar.loading} />;
  if (error) return <ErrorState message={t.calendar.error} />;

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Typography variant="title">{t.calendar.title}</Typography>
          <Typography muted>{t.calendar.subtitle}</Typography>
        </View>
        <Ionicons name="calendar-outline" size={30} color={theme.colors.primary} />
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Button
            label={t.calendar.previous}
            variant="ghost"
            icon="chevron-back"
            iconOnly={!showNavLabels}
            accessibilityHint={t.calendar.previousMonth}
            onPress={() => setMonth(addMonths(month, -1))}
          />
          <Typography variant="heading" style={styles.monthName}>
            {formatDate(month, { month: 'long', year: 'numeric' })}
          </Typography>
          <Button
            label={t.calendar.next}
            variant="ghost"
            icon="chevron-forward"
            iconOnly={!showNavLabels}
            accessibilityHint={t.calendar.nextMonth}
            onPress={() => setMonth(addMonths(month, 1))}
          />
        </View>
        <MonthCalendar
          month={month}
          entries={entries}
          prediction={prediction}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </Card>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.period }]} />
          <Typography variant="caption" style={styles.legendLabel}>
            {t.calendar.legendPeriod}
          </Typography>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { borderColor: theme.colors.period, borderWidth: 2, borderStyle: 'dashed' },
            ]}
          />
          <Typography variant="caption" style={styles.legendLabel}>
            {t.calendar.legendPrediction}
          </Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.fertileSoft }]} />
          <Typography variant="caption" style={styles.legendLabel}>
            {t.calendar.legendFertile}
          </Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendSwatch}>
            <View style={[styles.tinyDot, { backgroundColor: theme.colors.accent }]} />
          </View>
          <Typography variant="caption" style={styles.legendLabel}>
            {t.calendar.legendSymptom}
          </Typography>
        </View>
      </View>

      <Card
        tone={entry != null && entry.flow !== 'none' ? 'primary' : 'default'}
        style={styles.dayCard}
      >
        <View style={styles.dayCardHeader}>
          <View style={styles.dayCardTitle}>
            <Typography variant="caption" muted>
              {t.calendar.selectedDay}
            </Typography>
            <Typography variant="heading">{formatDate(selectedDate)}</Typography>
          </View>
          {entry ? (
            <View style={[styles.savedBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <Typography variant="caption" style={styles.savedBadgeText}>
                {t.calendar.hasEntry}
              </Typography>
            </View>
          ) : null}
        </View>
        <Typography muted>
          {entry
            ? [
                entry.flow !== 'none' ? t.category.bleeding : null,
                entry.mood ? t.category.mood : null,
                entry.pain != null ? t.category.pain : null,
                entry.symptoms.length ? t.calendar.symptomCount(entry.symptoms.length) : null,
              ]
                .filter(Boolean)
                .join(' · ') || t.calendar.otherRecorded
            : t.calendar.nothingRecorded}
        </Typography>
        <Button
          label={entry ? t.entry.open : t.entry.logDay}
          icon="create-outline"
          onPress={() => router.push(`/day/${selectedDate}`)}
        />
      </Card>

      {prediction ? (
        <Card tone="fertile">
          <Typography variant="label">{t.calendar.noteTitle}</Typography>
          <Typography muted style={styles.note}>
            {t.calendar.noteBody}
          </Typography>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  titleText: {
    flex: 1,
    gap: spacing.xs,
  },
  calendarCard: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  monthName: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  // Two columns while they fit; each label wraps inside its own column.
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: '46%',
    flex: 1,
  },
  legendLabel: {
    flexShrink: 1,
  },
  legendDot: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: radii.pill,
  },
  legendSwatch: {
    width: 20,
    flexShrink: 0,
    alignItems: 'center',
  },
  tinyDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  dayCard: {
    gap: spacing.lg,
  },
  // The badge moves below the date when both do not fit on one line.
  dayCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dayCardTitle: {
    flexShrink: 1,
  },
  savedBadge: {
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  savedBadgeText: {
    flexShrink: 1,
  },
  note: {
    marginTop: spacing.sm,
  },
});
