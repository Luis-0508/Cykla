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
import { useToggleCycleExclusion } from '@/hooks/useCyklaData';
import { usePrediction } from '@/hooks/usePrediction';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function InsightsScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
  const shortDate = (date: string) => formatDate(date, { day: 'numeric', month: 'short' });
  const { entries, cycles, prediction, ambiguousHistory, isLoading, error } = usePrediction();
  const toggleExclusion = useToggleCycleExclusion();
  const stats = calculateCycleStats(cycles, entries);
  const maximumLength = Math.max(1, ...cycles.map((cycle) => cycle.lengthDays ?? 0));

  if (isLoading) return <LoadingState label={t.insights.loading} />;
  if (error) return <ErrorState message={t.insights.error} />;

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">{t.insights.title}</Typography>
          <Typography muted>{t.insights.subtitle}</Typography>
        </View>
        <Ionicons name="analytics-outline" size={31} color={theme.colors.primary} />
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Typography variant="display">{stats.averageLength ?? '–'}</Typography>
          <Typography variant="label">{t.insights.averageLabel}</Typography>
          <Typography variant="caption" muted>
            {t.insights.fromCycles(stats.usableCycles)}
          </Typography>
        </Card>
        <Card tone="accent" style={styles.statCard}>
          <Typography variant="display">
            {stats.shortest && stats.longest ? `${stats.shortest}–${stats.longest}` : '–'}
          </Typography>
          <Typography variant="label">{t.insights.rangeLabel}</Typography>
          <Typography variant="caption" muted>
            {t.insights.rangeCaption}
          </Typography>
        </Card>
        <Card style={styles.statCard}>
          <Typography variant="display">{stats.documentedDays}</Typography>
          <Typography variant="label">{t.insights.documentedDays}</Typography>
          <Typography variant="caption" muted>
            {t.insights.documentedCaption}
          </Typography>
        </Card>
        <Card tone="fertile" style={styles.statCard}>
          <Typography variant="display">{stats.symptomDays}</Typography>
          <Typography variant="label">{t.insights.symptomDays}</Typography>
          <Typography variant="caption" muted>
            {t.insights.symptomCaption}
          </Typography>
        </Card>
      </View>

      {prediction ? (
        <Card tone="primary" style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Typography variant="heading">{t.insights.currentPrediction}</Typography>
            {prediction.overdue ? null : <ConfidenceBadge confidence={prediction.confidence} />}
          </View>
          {prediction.overdue ? (
            <>
              <Typography variant="title">{t.estimate.overdueTitle}</Typography>
              <Typography muted>
                {t.estimate.overdueBody(
                  formatDate(prediction.windowEnd, { day: 'numeric', month: 'long' }),
                )}
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="title">
                {t.estimate.range(
                  shortDate(prediction.windowStart),
                  shortDate(prediction.windowEnd),
                )}
              </Typography>
              <Typography muted>
                {prediction.uncertainHistory
                  ? t.estimate.uncertainBody
                  : t.estimate.explanation(prediction.completeCycleCount)}
              </Typography>
            </>
          )}
          <Button
            label={t.insights.understand}
            variant="secondary"
            onPress={() => router.push('/prediction')}
          />
        </Card>
      ) : (
        <Card>
          <Typography variant="heading">{t.insights.noPrediction}</Typography>
          <Typography muted style={styles.cardCopy}>
            {ambiguousHistory ? t.estimate.ambiguousBody : t.insights.noPredictionBody}
          </Typography>
        </Card>
      )}

      <View style={styles.sectionHead}>
        <Typography variant="heading">{t.insights.history}</Typography>
        <Typography muted>{t.insights.historySubtitle}</Typography>
      </View>
      {cycles.length === 0 ? (
        <Card>
          <Typography muted>{t.insights.noHistory}</Typography>
        </Card>
      ) : (
        <View style={styles.cycleList}>
          {[...cycles].reverse().map((cycle) => (
            <Card key={cycle.startDate} style={cycle.excluded ? styles.excludedCard : undefined}>
              <View style={styles.cycleHeader}>
                <View style={styles.cycleText}>
                  <Typography variant="label">
                    {t.insights.cycleStart(shortDate(cycle.startDate))}
                  </Typography>
                  <Typography variant="caption" muted>
                    {cycle.lengthDays
                      ? t.common.dayCount(cycle.lengthDays)
                      : t.insights.currentCycle}
                  </Typography>
                  {cycle.excluded ? null : cycle.likelyMissedPeriod ? (
                    <Typography variant="caption" muted>
                      {t.insights.likelyMissedPeriod}
                    </Typography>
                  ) : cycle.possibleMissedPeriod ? (
                    <Typography variant="caption" muted>
                      {t.insights.possibleMissedPeriod}
                    </Typography>
                  ) : null}
                </View>
                {cycle.lengthDays ? (
                  <Button
                    label={cycle.excluded ? t.insights.include : t.insights.exclude}
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
                  accessibilityLabel={t.insights.cycleLengthLabel(cycle.lengthDays)}
                  style={[styles.barTrack, { backgroundColor: theme.colors.primarySoft }]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor:
                          cycle.excluded || cycle.likelyMissedPeriod
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
        <Typography variant="label">{t.insights.noDiagnosis}</Typography>
        <Typography muted style={styles.cardCopy}>
          {t.insights.noDiagnosisBody}
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
  cycleText: {
    flex: 1,
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
