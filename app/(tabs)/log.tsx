import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { DayStrip } from '@/components/DayStrip';
import { formatGermanDate } from '@/domain/dateOnly';
import { useEntries } from '@/hooks/useCyklaData';
import { useUiStore } from '@/store/uiStore';
import { spacing, useCyklaTheme } from '@/theme/theme';

const categories = [
  {
    icon: 'water-outline',
    title: 'Blutung',
    body: 'Von keiner Blutung bis stark',
    color: 'period',
  },
  { icon: 'pulse-outline', title: 'Schmerzen', body: 'Intensität von 0 bis 10', color: 'danger' },
  {
    icon: 'happy-outline',
    title: 'Stimmung',
    body: 'Ruhig, zufrieden, sensibel und mehr',
    color: 'accent',
  },
  {
    icon: 'flash-outline',
    title: 'Energie',
    body: 'Von sehr niedrig bis sehr hoch',
    color: 'fertile',
  },
  { icon: 'moon-outline', title: 'Schlaf', body: 'Dauer und Qualität', color: 'primary' },
  {
    icon: 'sparkles-outline',
    title: 'Symptome',
    body: 'Körperliche Beobachtungen',
    color: 'accent',
  },
] as const;

export default function LogScreen() {
  const theme = useCyklaTheme();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);
  const entriesQuery = useEntries();
  const entries = entriesQuery.data ?? [];
  const entry = entries.find((value) => value.date === selectedDate);

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">Eintragen</Typography>
          <Typography muted>Alles an einem Ort – gespeichert auf diesem Gerät.</Typography>
        </View>
        <Ionicons name="add-circle-outline" size={32} color={theme.colors.primary} />
      </View>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} entries={entries} />

      <Card tone="primary" style={styles.mainCard}>
        <Typography variant="caption" muted>
          {formatGermanDate(selectedDate).toUpperCase()}
        </Typography>
        <Typography variant="heading">
          {entry ? 'Eintrag ergänzen oder bearbeiten' : 'Wie geht es dir an diesem Tag?'}
        </Typography>
        <Typography muted>
          Du entscheidest, was du dokumentierst. Leere Bereiche bleiben leer.
        </Typography>
        <Button
          label={entry ? 'Eintrag öffnen' : 'Eintrag beginnen'}
          icon="create-outline"
          onPress={() => router.push(`/day/${selectedDate}`)}
        />
      </Card>

      <SectionHeader
        title="Kategorien"
        subtitle="Der vollständige Tageseditor speichert alle ausgewählten Kategorien gemeinsam."
      />
      <View style={styles.categoryList}>
        {categories.map((category) => {
          const color = theme.colors[category.color];
          return (
            <Card key={category.title} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${color}22` }]}>
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={23}
                  color={color}
                />
              </View>
              <View style={styles.categoryText}>
                <Typography variant="label">{category.title}</Typography>
                <Typography variant="caption" muted>
                  {category.body}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </Card>
          );
        })}
      </View>
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
  mainCard: {
    gap: spacing.md,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    flex: 1,
    gap: 2,
  },
});
