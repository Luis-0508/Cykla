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
import { addMonths, formatGermanDate, startOfMonth, todayDate } from '@/domain/dateOnly';
import { usePrediction } from '@/hooks/usePrediction';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function CalendarScreen() {
  const theme = useCyklaTheme();
  const [month, setMonth] = useState(startOfMonth(todayDate()));
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const { entries, prediction, isLoading, error } = usePrediction();
  const entry = entries.find((value) => value.date === selectedDate);

  if (isLoading) return <LoadingState label="Kalender wird geladen …" />;
  if (error) return <ErrorState message="Der lokale Kalender konnte nicht gelesen werden." />;

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Typography variant="title">Kalender</Typography>
          <Typography muted>Dokumentiertes und Berechnetes bleiben sichtbar getrennt.</Typography>
        </View>
        <Ionicons name="calendar-outline" size={30} color={theme.colors.primary} />
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Button
            label="Zurück"
            variant="ghost"
            icon="chevron-back"
            accessibilityHint="Vorherigen Monat anzeigen"
            onPress={() => setMonth(addMonths(month, -1))}
          />
          <Typography variant="heading" style={styles.monthName}>
            {formatGermanDate(month, { month: 'long', year: 'numeric' })}
          </Typography>
          <Button
            label="Weiter"
            variant="ghost"
            icon="chevron-forward"
            accessibilityHint="Nächsten Monat anzeigen"
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
          <Typography variant="caption">Dokumentierte Blutung</Typography>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { borderColor: theme.colors.period, borderWidth: 2, borderStyle: 'dashed' },
            ]}
          />
          <Typography variant="caption">Prognosezeitraum</Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.fertileSoft }]} />
          <Typography variant="caption">Möglicher fruchtbarer Zeitraum</Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tinyDot, { backgroundColor: theme.colors.accent }]} />
          <Typography variant="caption">Eintrag ohne Blutung</Typography>
        </View>
      </View>

      <Card
        tone={entry != null && entry.flow !== 'none' ? 'primary' : 'default'}
        style={styles.dayCard}
      >
        <View style={styles.dayCardHeader}>
          <View>
            <Typography variant="caption" muted>
              AUSGEWÄHLTER TAG
            </Typography>
            <Typography variant="heading">{formatGermanDate(selectedDate)}</Typography>
          </View>
          {entry ? (
            <View style={[styles.savedBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <Typography variant="caption">Eintrag vorhanden</Typography>
            </View>
          ) : null}
        </View>
        <Typography muted>
          {entry
            ? [
                entry.flow !== 'none' ? 'Blutung' : null,
                entry.mood ? 'Stimmung' : null,
                entry.pain != null ? 'Schmerz' : null,
                entry.symptoms.length ? `${entry.symptoms.length} Symptome` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Notiz oder Tageswert dokumentiert'
            : 'Für diesen Tag ist noch nichts dokumentiert.'}
        </Typography>
        <Button
          label={entry ? 'Eintrag öffnen' : 'Tag eintragen'}
          icon="create-outline"
          onPress={() => router.push(`/day/${selectedDate}`)}
        />
      </Card>

      {prediction ? (
        <Card tone="fertile">
          <Typography variant="label">Hinweis zur Schätzung</Typography>
          <Typography muted style={styles.note}>
            Fruchtbarkeit lässt sich aus Kalenderdaten nicht sicher bestimmen. Auch außerhalb
            markierter Tage ist eine Schwangerschaft möglich; Cykla ist keine Verhütungsmethode.
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
