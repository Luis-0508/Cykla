import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { calculateCycleStats } from '@/domain/statistics';
import { formatGermanDate } from '@/domain/dateOnly';
import { useToggleCycleExclusion } from '@/hooks/useCyklaData';
import { usePrediction } from '@/hooks/usePrediction';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function InsightsScreen() {
  const theme = useCyklaTheme();
  const { entries, cycles, prediction, isLoading, error } = usePrediction();
  const toggleExclusion = useToggleCycleExclusion();
  const stats = calculateCycleStats(cycles, entries);
  const maximumLength = Math.max(1, ...cycles.map((cycle) => cycle.lengthDays ?? 0));

  if (isLoading) return <LoadingState label="Trends werden berechnet …" />;
  if (error) return <ErrorState message="Die lokalen Einträge konnten nicht ausgewertet werden." />;

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">Deine Trends</Typography>
          <Typography muted>Nur dokumentierte Daten fließen in diese Übersicht ein.</Typography>
        </View>
        <Ionicons name="analytics-outline" size={31} color={theme.colors.primary} />
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Typography variant="display">{stats.averageLength ?? '–'}</Typography>
          <Typography variant="label">Tage im Durchschnitt</Typography>
          <Typography variant="caption" muted>
            aus {stats.usableCycles}{' '}
            {stats.usableCycles === 1 ? 'vollständigem Zyklus' : 'vollständigen Zyklen'}
          </Typography>
        </Card>
        <Card tone="accent" style={styles.statCard}>
          <Typography variant="display">
            {stats.shortest && stats.longest ? `${stats.shortest}–${stats.longest}` : '–'}
          </Typography>
          <Typography variant="label">Persönliche Spanne</Typography>
          <Typography variant="caption" muted>
            kürzester bis längster Zyklus
          </Typography>
        </Card>
        <Card style={styles.statCard}>
          <Typography variant="display">{stats.documentedDays}</Typography>
          <Typography variant="label">Dokumentierte Tage</Typography>
          <Typography variant="caption" muted>
            insgesamt auf diesem Gerät
          </Typography>
        </Card>
        <Card tone="fertile" style={styles.statCard}>
          <Typography variant="display">{stats.symptomDays}</Typography>
          <Typography variant="label">Tage mit Symptomen</Typography>
          <Typography variant="caption" muted>
            keine medizinische Bewertung
          </Typography>
        </Card>
      </View>

      {prediction ? (
        <Card tone="primary" style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Typography variant="heading">Aktuelle Prognose</Typography>
            <ConfidenceBadge confidence={prediction.confidence} />
          </View>
          <Typography variant="title">
            {formatGermanDate(prediction.windowStart, { day: 'numeric', month: 'short' })} –{' '}
            {formatGermanDate(prediction.windowEnd, { day: 'numeric', month: 'short' })}
          </Typography>
          <Typography muted>{prediction.explanation}</Typography>
          <Button
            label="Berechnung verstehen"
            variant="secondary"
            onPress={() => router.push('/prediction')}
          />
        </Card>
      ) : (
        <Card>
          <Typography variant="heading">Noch keine Prognose</Typography>
          <Typography muted style={styles.cardCopy}>
            Trage einen Periodenbeginn ein. Mehrere vollständige Zyklen verbessern die
            Konfidenzanzeige.
          </Typography>
        </Card>
      )}

      <View style={styles.sectionHead}>
        <Typography variant="heading">Zyklusverlauf</Typography>
        <Typography muted>
          Ausgeschlossene Zyklen bleiben erhalten, zählen aber nicht zur Prognose.
        </Typography>
      </View>
      {cycles.length === 0 ? (
        <Card>
          <Typography muted>Noch kein Zyklusverlauf vorhanden.</Typography>
        </Card>
      ) : (
        <View style={styles.cycleList}>
          {[...cycles].reverse().map((cycle) => (
            <Card key={cycle.startDate} style={cycle.excluded ? styles.excludedCard : undefined}>
              <View style={styles.cycleHeader}>
                <View>
                  <Typography variant="label">
                    Start {formatGermanDate(cycle.startDate, { day: 'numeric', month: 'short' })}
                  </Typography>
                  <Typography variant="caption" muted>
                    {cycle.lengthDays ? `${cycle.lengthDays} Tage` : 'Aktueller Zyklus'}
                  </Typography>
                </View>
                {cycle.lengthDays ? (
                  <Button
                    label={cycle.excluded ? 'Einbeziehen' : 'Ausschließen'}
                    variant="ghost"
                    onPress={() =>
                      toggleExclusion.mutate({
                        startDate: cycle.startDate,
                        excluded: !cycle.excluded,
                      })
                    }
                  />
                ) : null}
              </View>
              {cycle.lengthDays ? (
                <View
                  accessibilityLabel={`Zykluslänge ${cycle.lengthDays} Tage`}
                  style={[styles.barTrack, { backgroundColor: theme.colors.primarySoft }]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: cycle.excluded
                          ? theme.colors.textMuted
                          : theme.colors.primary,
                        width: `${Math.max(12, (cycle.lengthDays / maximumLength) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      <Card tone="accent">
        <Typography variant="label">Keine Diagnose</Typography>
        <Typography muted style={styles.cardCopy}>
          Veränderungen können normal sein. Bei starken, neuen oder anhaltenden Beschwerden solltest
          du medizinischen Rat einholen.
        </Typography>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    minHeight: 170,
    gap: spacing.sm,
  },
  predictionCard: {
    gap: spacing.lg,
  },
  predictionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHead: {
    gap: spacing.xs,
  },
  cycleList: {
    gap: spacing.md,
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  barTrack: {
    height: 9,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  bar: {
    height: 9,
    borderRadius: radii.pill,
  },
  excludedCard: {
    opacity: 0.62,
  },
  cardCopy: {
    marginTop: spacing.sm,
  },
});
