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
import { differenceInDays, formatGermanDate, todayDate } from '@/domain/dateOnly';
import { usePrediction } from '@/hooks/usePrediction';
import { useUiStore } from '@/store/uiStore';
import { spacing, useCyklaTheme } from '@/theme/theme';

const flowLabels = {
  none: 'Keine Blutung',
  spotting: 'Schmierblutung',
  light: 'Leichte Blutung',
  medium: 'Mittlere Blutung',
  heavy: 'Starke Blutung',
} as const;

const moodLabels = {
  calm: 'Ruhig',
  happy: 'Zufrieden',
  sensitive: 'Sensibel',
  irritable: 'Gereizt',
  sad: 'Traurig',
  stressed: 'Gestresst',
} as const;

export default function TodayScreen() {
  const theme = useCyklaTheme();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);
  const { entries, starts, prediction, isLoading, error } = usePrediction();
  const selectedEntry = entries.find((entry) => entry.date === selectedDate);
  const hasFlow = selectedEntry != null && selectedEntry.flow !== 'none';
  const latestStart = [...starts].reverse().find((date) => date <= selectedDate);
  const cycleDay = latestStart ? differenceInDays(selectedDate, latestStart) + 1 : null;
  const daysUntil = prediction ? differenceInDays(prediction.expectedStart, selectedDate) : null;

  if (isLoading) return <LoadingState label="Dein Überblick wird geladen …" />;
  if (error) return <ErrorState message="Die lokalen Daten konnten nicht gelesen werden." />;

  const statusTitle = hasFlow
    ? 'Dokumentierte Periode'
    : daysUntil !== null && daysUntil >= 0
      ? 'Nächste Periode'
      : 'Dein Zyklus';
  const statusValue = hasFlow
    ? cycleDay
      ? `Tag ${cycleDay}`
      : flowLabels[selectedEntry.flow]
    : daysUntil === 0
      ? 'ungefähr heute'
      : daysUntil !== null && daysUntil > 0
        ? `ungefähr in ${daysUntil} Tagen`
        : prediction
          ? `geschätzt ab ${formatGermanDate(prediction.windowStart, { day: 'numeric', month: 'short' })}`
          : 'Noch keine Schätzung';

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <CyklaMark size={45} />
        <View style={styles.headerText}>
          <Typography variant="caption" muted>
            {selectedDate === todayDate() ? 'HEUTE' : 'AUSGEWÄHLTER TAG'}
          </Typography>
          <Typography variant="heading">
            {formatGermanDate(selectedDate, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Typography>
        </View>
        <Ionicons
          accessibilityLabel="Alle Daten sind lokal gespeichert"
          name="shield-checkmark-outline"
          size={25}
          color={theme.colors.primary}
        />
      </View>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} entries={entries} />

      <Card tone="primary" style={styles.statusCard}>
        <View style={styles.eyebrowRow}>
          <Typography variant="caption" style={{ color: theme.colors.primary }}>
            {hasFlow ? 'DOKUMENTIERT' : 'SCHÄTZUNG'}
          </Typography>
          {prediction && !hasFlow ? <ConfidenceBadge confidence={prediction.confidence} /> : null}
        </View>
        <View>
          <Typography variant="heading">{statusTitle}</Typography>
          <Typography variant="display" style={styles.statusValue}>
            {statusValue}
          </Typography>
        </View>
        <Typography muted>
          {hasFlow
            ? 'Diese Angabe stammt aus deinem Eintrag.'
            : (prediction?.explanation ??
              'Sobald ein Periodenbeginn dokumentiert ist, erscheint hier eine vorsichtige Schätzung.')}
        </Typography>
        <View style={styles.actionRow}>
          <View style={styles.action}>
            <Button
              label={selectedEntry ? 'Eintrag bearbeiten' : 'Tag eintragen'}
              icon="create-outline"
              onPress={() => router.push(`/day/${selectedDate}`)}
            />
          </View>
          {prediction ? (
            <View style={styles.action}>
              <Button
                label="So rechnen wir"
                variant="secondary"
                onPress={() => router.push('/prediction')}
              />
            </View>
          ) : null}
        </View>
      </Card>

      <SectionHeader
        title={selectedDate === todayDate() ? 'Heute eintragen' : 'Diesen Tag eintragen'}
        subtitle="Die wichtigsten Angaben sind mit wenigen Berührungen erreichbar."
      />
      <View style={styles.quickGrid}>
        {[
          ['water-outline', 'Blutung'],
          ['pulse-outline', 'Schmerz'],
          ['happy-outline', 'Stimmung'],
          ['moon-outline', 'Schlaf'],
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

      <SectionHeader title="Dein Tagesüberblick" />
      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <Ionicons name="water-outline" color={theme.colors.period} size={23} />
          <Typography variant="label">Blutung</Typography>
          <Typography muted>
            {selectedEntry ? flowLabels[selectedEntry.flow] : 'Nicht eingetragen'}
          </Typography>
        </Card>
        <Card style={styles.metric}>
          <Ionicons name="happy-outline" color={theme.colors.accent} size={23} />
          <Typography variant="label">Stimmung</Typography>
          <Typography muted>
            {selectedEntry?.mood ? moodLabels[selectedEntry.mood] : 'Nicht eingetragen'}
          </Typography>
        </Card>
        <Card style={styles.metric}>
          <Ionicons name="moon-outline" color={theme.colors.primary} size={23} />
          <Typography variant="label">Schlaf</Typography>
          <Typography muted>
            {selectedEntry?.sleepHours
              ? `${selectedEntry.sleepHours} Stunden`
              : 'Nicht eingetragen'}
          </Typography>
        </Card>
        <Card style={styles.metric}>
          <Ionicons name="pulse-outline" color={theme.colors.danger} size={23} />
          <Typography variant="label">Schmerz</Typography>
          <Typography muted>
            {selectedEntry?.pain != null ? `${selectedEntry.pain} von 10` : 'Nicht eingetragen'}
          </Typography>
        </Card>
      </View>

      <Card tone="accent">
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle-outline" color={theme.colors.primary} size={26} />
          <Typography variant="heading">Einträge sind Beobachtungen</Typography>
        </View>
        <Typography muted style={styles.infoCopy}>
          Schwankungen können viele Gründe haben. Cykla zeigt Muster, stellt aber keine Diagnose.
          Bei starken oder anhaltenden Beschwerden hole bitte medizinischen Rat ein.
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
