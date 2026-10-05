import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { CyklaMark } from '@/components/ui/CyklaMark';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { DayStrip } from '@/components/DayStrip';
import { differenceInDays, todayDate } from '@/domain/dateOnly';
import { describeDayStatus } from '@/domain/dayStatus';
import { usePrediction } from '@/hooks/usePrediction';
import { useI18n } from '@/i18n/I18nProvider';
import { useUiStore } from '@/store/uiStore';
import { spacing, useCyklaTheme } from '@/theme/theme';

export default function TodayScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate, formatNumber } = useI18n();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);
  const { entries, starts, prediction, ambiguousHistory, isLoading, error } = usePrediction();
  const selectedEntry = entries.find((entry) => entry.date === selectedDate);
  const hasFlow = selectedEntry != null && selectedEntry.flow !== 'none';
  const latestStart = [...starts].reverse().find((date) => date <= selectedDate);
  const cycleDay = latestStart ? differenceInDays(selectedDate, latestStart) + 1 : null;
  const status = describeDayStatus(selectedDate, starts, prediction);

  if (isLoading) return <LoadingState label={t.today.loading} />;
  if (error) return <ErrorState message={t.today.error} />;

  const statusTitle = hasFlow
    ? t.today.recordedPeriod
    : status.kind === 'countdown' || status.kind === 'overdue' || status.kind === 'uncertain'
      ? t.today.nextPeriod
      : t.today.yourCycle;
  const statusValue = hasFlow
    ? cycleDay
      ? t.today.cycleDay(cycleDay)
      : t.flow[selectedEntry.flow]
    : status.kind === 'countdown'
      ? status.days === 0
        ? t.today.aboutToday
        : t.today.aboutInDays(status.days)
      : status.kind === 'inWindow'
        ? t.today.estimatedFrom(formatDate(status.windowStart, { day: 'numeric', month: 'short' }))
        : status.kind === 'uncertain'
          ? t.estimate.range(
              formatDate(status.windowStart, { day: 'numeric', month: 'short' }),
              formatDate(status.windowEnd, { day: 'numeric', month: 'short' }),
            )
          : status.kind === 'overdue'
            ? t.today.laterThanEstimated
            : status.kind === 'pastCycle'
              ? status.cycleDay
                ? t.today.cycleDay(status.cycleDay)
                : t.common.notRecorded
              : t.today.noEstimate;
  const statusBody = hasFlow
    ? t.today.fromEntry
    : status.kind === 'overdue'
      ? t.estimate.overdueBody(formatDate(status.windowEnd, { day: 'numeric', month: 'long' }))
      : status.kind === 'pastCycle'
        ? t.today.pastDayBody
        : status.kind === 'uncertain'
          ? t.estimate.uncertainBody
          : prediction
            ? t.estimate.explanation(prediction.completeCycleCount)
            : ambiguousHistory
              ? t.estimate.ambiguousBody
              : t.today.noEstimateBody;
  // A confidence level only belongs to a current estimate.
  const showConfidence =
    prediction != null && !hasFlow && status.kind !== 'overdue' && status.kind !== 'pastCycle';

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <CyklaMark size={45} />
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            {selectedDate === todayDate() ? t.today.eyebrowToday : t.today.eyebrowSelected}
          </Typography>
          <Typography variant="heading">
            {formatDate(selectedDate, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Typography>
        </View>
        <Ionicons
          accessibilityLabel={t.today.localDataLabel}
          name="shield-checkmark-outline"
          size={25}
          color={theme.colors.primary}
        />
      </View>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} entries={entries} />

      <Card tone="primary" style={styles.statusCard}>
        <View style={styles.eyebrowRow}>
          <Typography variant="caption" style={{ color: theme.colors.primary }}>
            {hasFlow ? t.today.eyebrowRecorded : t.today.eyebrowEstimate}
          </Typography>
          {showConfidence ? <ConfidenceBadge confidence={prediction.confidence} /> : null}
        </View>
        <View>
          <Typography variant="heading">{statusTitle}</Typography>
          <Typography variant="display" style={styles.statusValue}>
            {statusValue}
          </Typography>
        </View>
        <Typography muted>{statusBody}</Typography>
        <View style={styles.actionRow}>
          <View style={styles.action}>
            <Button
              label={selectedEntry ? t.entry.edit : t.entry.logDay}
              icon="create-outline"
              onPress={() => router.push(`/day/${selectedDate}`)}
            />
          </View>
          {prediction ? (
            <View style={styles.action}>
              <Button
                label={t.today.howWeCalculate}
                variant="secondary"
                onPress={() => router.push('/prediction')}
              />
            </View>
          ) : null}
        </View>
      </Card>

      <SectionHeader
        title={selectedDate === todayDate() ? t.today.logToday : t.today.logThisDay}
        subtitle={t.today.quickSubtitle}
      />
      <View style={styles.quickGrid}>
        {[
          ['water-outline', t.category.bleeding],
          ['pulse-outline', t.category.pain],
          ['happy-outline', t.category.mood],
          ['moon-outline', t.category.sleep],
        ].map(([icon, label]) => (
          <View style={styles.quickItem} key={label}>
            <Button
              label={label!}
              variant="secondary"
              icon={icon as keyof typeof Ionicons.glyphMap}
              onPress={() => router.push(`/day/${selectedDate}`)}
            />
          </View>
        ))}
      </View>

      <SectionHeader title={t.today.overview} />
      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <Ionicons name="water-outline" color={theme.colors.period} size={23} />
          <Typography variant="label">{t.category.bleeding}</Typography>
          <Typography muted>
            {selectedEntry ? t.flow[selectedEntry.flow] : t.common.notRecorded}
          </Typography>
        </Card>
        <Card style={styles.metric}>
          <Ionicons name="happy-outline" color={theme.colors.accent} size={23} />
          <Typography variant="label">{t.category.mood}</Typography>
          <Typography muted>
            {selectedEntry?.mood ? t.mood[selectedEntry.mood] : t.common.notRecorded}
          </Typography>
        </Card>
        <Card style={styles.metric}>
          <Ionicons name="moon-outline" color={theme.colors.primary} size={23} />
          <Typography variant="label">{t.category.sleep}</Typography>
          <Typography muted>
            {selectedEntry?.sleepHours
              ? t.common.hours(formatNumber(selectedEntry.sleepHours))
              : t.common.notRecorded}
          </Typography>
        </Card>
        <Card style={styles.metric}>
          <Ionicons name="pulse-outline" color={theme.colors.danger} size={23} />
          <Typography variant="label">{t.category.pain}</Typography>
          <Typography muted>
            {selectedEntry?.pain != null
              ? t.today.painValue(selectedEntry.pain)
              : t.common.notRecorded}
          </Typography>
        </Card>
      </View>

      <Card tone="accent">
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle-outline" color={theme.colors.primary} size={26} />
          <Typography variant="heading">{t.today.observationsTitle}</Typography>
        </View>
        <Typography muted style={styles.infoCopy}>
          {t.today.observationsBody}
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
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  statusCard: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  eyebrowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusValue: {
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  action: {
    minWidth: 170,
    flex: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickItem: {
    width: '48%',
    flexGrow: 1,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    width: '47%',
    flexGrow: 1,
    minHeight: 136,
    gap: spacing.sm,
  },
  infoIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoCopy: {
    marginTop: spacing.sm,
  },
});
