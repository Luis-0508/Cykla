import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function CalendarScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
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
          <Typography variant="caption">{t.calendar.legendPeriod}</Typography>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { borderColor: theme.colors.period, borderWidth: 2, borderStyle: 'dashed' },
            ]}
          />
          <Typography variant="caption">{t.calendar.legendPrediction}</Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.fertileSoft }]} />
          <Typography variant="caption">{t.calendar.legendFertile}</Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tinyDot, { backgroundColor: theme.colors.accent }]} />
          <Typography variant="caption">{t.calendar.legendSymptom}</Typography>
        </View>
      </View>

      <Card
        tone={entry != null && entry.flow !== 'none' ? 'primary' : 'default'}
        style={styles.dayCard}
      >
        <View style={styles.dayCardHeader}>
          <View>
            <Typography variant="caption" muted>
              {t.calendar.selectedDay}
            </Typography>
            <Typography variant="heading">{formatDate(selectedDate)}</Typography>
          </View>
          {entry ? (
            <View style={[styles.savedBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <Typography variant="caption">{t.calendar.hasEntry}</Typography>
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: '46%',
    flex: 1,
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
  },
  tinyDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    marginHorizontal: 6,
  },
  dayCard: {
    gap: spacing.lg,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  savedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  note: {
    marginTop: spacing.sm,
  },
});
