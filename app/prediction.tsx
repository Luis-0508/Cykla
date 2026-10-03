import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Card } from '@/components/ui/Card';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { usePrediction } from '@/hooks/usePrediction';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function PredictionScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate, formatNumber } = useI18n();
  const { prediction, cycles, isLoading, error } = usePrediction();
  if (isLoading) return <LoadingState label={t.prediction.loading} />;
  if (error) return <ErrorState message={t.prediction.error} />;

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.prediction.close}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          style={[styles.close, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            {t.prediction.eyebrow}
          </Typography>
          <Typography variant="title">{t.prediction.title}</Typography>
        </View>
      </View>

      {prediction ? (
        <>
          {prediction.overdue ? (
            // An expired window is history, not a current estimate: no confidence, no range headline.
            <Card tone="accent" style={styles.hero}>
              <Typography variant="caption">{t.prediction.windowEyebrow}</Typography>
              <Typography variant="title">{t.estimate.overdueTitle}</Typography>
              <Typography muted>
                {t.estimate.overdueBody(
                  formatDate(prediction.windowEnd, { day: 'numeric', month: 'long' }),
                )}
              </Typography>
            </Card>
          ) : (
            <Card tone="primary" style={styles.hero}>
              <ConfidenceBadge confidence={prediction.confidence} />
              <Typography variant="caption">{t.prediction.windowEyebrow}</Typography>
              <Typography variant="title">
                {t.estimate.rangeWords(
                  formatDate(prediction.windowStart, { day: 'numeric', month: 'long' }),
                  formatDate(prediction.windowEnd, { day: 'numeric', month: 'long' }),
                )}
              </Typography>
              <Typography muted>
                {prediction.uncertainHistory
                  ? t.estimate.uncertainBody
                  : t.prediction.midpoint(formatDate(prediction.expectedStart))}
              </Typography>
            </Card>
          )}

          <Card style={styles.section}>
            <Typography variant="heading">{t.prediction.startsTitle}</Typography>
            <Typography muted>{t.prediction.startsBody}</Typography>
            <View style={styles.metricRow}>
              <Typography variant="display">{prediction.completeCycleCount}</Typography>
              <Typography muted>
                {t.prediction.startsMetric(prediction.completeCycleCount)}
              </Typography>
            </View>
          </Card>

          <Card style={styles.section}>
            <Typography variant="heading">{t.prediction.averageTitle}</Typography>
            <Typography muted>{t.prediction.averageBody}</Typography>
            <View style={styles.metricRow}>
              <Typography variant="display">{prediction.averageCycleLength}</Typography>
              <Typography muted>
                {t.prediction.averageMetric(prediction.averageCycleLength)}
              </Typography>
            </View>
          </Card>

          <Card style={styles.section}>
            <Typography variant="heading">{t.prediction.spreadTitle}</Typography>
            <Typography muted>{t.prediction.spreadBody}</Typography>
            <View style={styles.metricRow}>
              <Typography variant="display">±{formatNumber(prediction.variationDays)}</Typography>
              <Typography muted>{t.prediction.spreadMetric}</Typography>
            </View>
          </Card>

          <Card tone="fertile" style={styles.section}>
            <Typography variant="heading">{t.prediction.fertileTitle}</Typography>
            <Typography>
              {!prediction.overdue && prediction.fertileWindowStart && prediction.fertileWindowEnd
                ? t.estimate.rangeWords(
                    formatDate(prediction.fertileWindowStart, { day: 'numeric', month: 'short' }),
                    formatDate(prediction.fertileWindowEnd, { day: 'numeric', month: 'short' }),
                  )
                : t.prediction.fertileUnavailable}
            </Typography>
            <Typography muted>{t.prediction.fertileBody}</Typography>
          </Card>
        </>
      ) : (
        <Card>
          <Typography variant="heading">{t.prediction.notEnoughTitle}</Typography>
          <Typography muted style={styles.cardCopy}>
            {t.prediction.notEnoughBody}
          </Typography>
        </Card>
      )}

      <Card tone="accent">
        <View style={styles.warningHead}>
          <Ionicons name="medical-outline" size={24} color={theme.colors.primary} />
          <Typography variant="heading">{t.prediction.disclaimerTitle}</Typography>
        </View>
        <Typography muted style={styles.cardCopy}>
          {t.prediction.disclaimerBody}
        </Typography>
      </Card>

      <Typography variant="caption" muted style={styles.version}>
        {t.prediction.footer(cycles.length)}
      </Typography>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  close: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  hero: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  warningHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardCopy: {
    marginTop: spacing.sm,
  },
  version: {
    textAlign: 'center',
  },
});
