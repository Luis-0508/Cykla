import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Card } from '@/components/ui/Card';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { formatGermanDate } from '@/domain/dateOnly';
import { usePrediction } from '@/hooks/usePrediction';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function PredictionScreen() {
  const theme = useCyklaTheme();
  const { prediction, cycles, isLoading, error } = usePrediction();
  if (isLoading) return <LoadingState label="Berechnung wird geladen …" />;
  if (error) return <ErrorState message="Die Berechnung konnte nicht geladen werden." />;

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Erklärung schließen"
          onPress={() => router.back()}
          style={[styles.close, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            TRANSPARENTES MODELL
          </Typography>
          <Typography variant="title">So entsteht deine Schätzung</Typography>
        </View>
      </View>

      {prediction ? (
        <>
          <Card tone="primary" style={styles.hero}>
            <ConfidenceBadge confidence={prediction.confidence} />
            <Typography variant="caption">MÖGLICHER ZEITRAUM</Typography>
            <Typography variant="title">
              {formatGermanDate(prediction.windowStart, { day: 'numeric', month: 'long' })} bis{' '}
              {formatGermanDate(prediction.windowEnd, { day: 'numeric', month: 'long' })}
            </Typography>
            <Typography muted>
              Der rechnerische Mittelpunkt liegt am {formatGermanDate(prediction.expectedStart)}.
            </Typography>
          </Card>

          <Card style={styles.section}>
            <Typography variant="heading">1. Dokumentierte Starts</Typography>
            <Typography muted>
              Wir betrachten nur Tage, die du selbst als Blutung gespeichert hast. Zusammenhängende
              Periodentage bilden einen Periodenbeginn.
            </Typography>
            <View style={styles.metricRow}>
              <Typography variant="display">{prediction.completeCycleCount}</Typography>
              <Typography muted>vollständige, einbezogene Zyklen</Typography>
            </View>
          </Card>

          <Card style={styles.section}>
            <Typography variant="heading">2. Gewichteter Durchschnitt</Typography>
            <Typography muted>
              Neuere Zykluslängen erhalten mit dem Faktor 0,85 etwas mehr Gewicht. Deutliche
              Ausreißer bleiben sichtbar, zählen aber schwächer.
            </Typography>
            <View style={styles.metricRow}>
              <Typography variant="display">{prediction.averageCycleLength}</Typography>
              <Typography muted>Tage als gewichtete Zykluslänge</Typography>
            </View>
          </Card>

          <Card style={styles.section}>
            <Typography variant="heading">3. Unsicherheit statt exaktem Tag</Typography>
            <Typography muted>
              Die Streuung deiner bisherigen Zykluslängen bestimmt die Breite des Zeitraums. Weniger
              als drei vollständige Zyklen ergeben immer niedrige Konfidenz.
            </Typography>
            <View style={styles.metricRow}>
              <Typography variant="display">±{prediction.variationDays}</Typography>
              <Typography muted>berechnete Streuung in Tagen</Typography>
            </View>
          </Card>

          <Card tone="fertile" style={styles.section}>
            <Typography variant="heading">Möglicher fruchtbarer Zeitraum</Typography>
            <Typography>
              {formatGermanDate(prediction.fertileWindowStart, {
                day: 'numeric',
                month: 'short',
              })}{' '}
              bis{' '}
              {formatGermanDate(prediction.fertileWindowEnd, {
                day: 'numeric',
                month: 'short',
              })}
            </Typography>
            <Typography muted>
              Diese grobe Annahme zählt 14 Tage vom erwarteten Periodenbeginn zurück und markiert
              fünf Tage davor bis einen Tag danach. Sie eignet sich nicht zur Verhütung.
            </Typography>
          </Card>
        </>
      ) : (
        <Card>
          <Typography variant="heading">Noch nicht genug für eine Schätzung</Typography>
          <Typography muted style={styles.cardCopy}>
            Dokumentiere mindestens einen Periodenbeginn. Die erste Schätzung verwendet zusätzlich
            deine typische Zykluslänge aus dem Onboarding.
          </Typography>
        </Card>
      )}

      <Card tone="accent">
        <View style={styles.warningHead}>
          <Ionicons name="medical-outline" size={24} color={theme.colors.primary} />
          <Typography variant="heading">Schätzung, keine Diagnose</Typography>
        </View>
        <Typography muted style={styles.cardCopy}>
          „Hohe Konfidenz“ bedeutet nicht Gewissheit. Schwangerschaft, Erkrankungen, Stress,
          Medikamente und weitere Faktoren können Zyklen verändern.
        </Typography>
      </Card>

      <Typography variant="caption" muted style={styles.version}>
        Modellversion 1.0 · {cycles.length} erkannte Zyklen · Berechnung ausschließlich lokal
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
