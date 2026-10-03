import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Typography } from '@/components/ui/Typography';
import { DayStrip } from '@/components/DayStrip';
import { useEntries } from '@/hooks/useCyklaData';
import { useI18n } from '@/i18n/I18nProvider';
import type { Messages } from '@/i18n/i18n';
import { useUiStore } from '@/store/uiStore';
import { spacing, useCyklaTheme } from '@/theme/theme';

const categories = (t: Messages) =>
  [
    {
      key: 'bleeding',
      icon: 'water-outline',
      title: t.category.bleeding,
      body: t.log.bleedingBody,
      color: 'period',
    },
    {
      key: 'pain',
      icon: 'pulse-outline',
      title: t.category.painPlural,
      body: t.log.painBody,
      color: 'danger',
    },
    {
      key: 'mood',
      icon: 'happy-outline',
      title: t.category.mood,
      body: t.log.moodBody,
      color: 'accent',
    },
    {
      key: 'energy',
      icon: 'flash-outline',
      title: t.category.energy,
      body: t.log.energyBody,
      color: 'fertile',
    },
    {
      key: 'sleep',
      icon: 'moon-outline',
      title: t.category.sleep,
      body: t.log.sleepBody,
      color: 'primary',
    },
    {
      key: 'symptoms',
      icon: 'sparkles-outline',
      title: t.category.symptoms,
      body: t.log.symptomsBody,
      color: 'accent',
    },
  ] as const;

export default function LogScreen() {
  const theme = useCyklaTheme();
  const { t, formatDate } = useI18n();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);
  const entriesQuery = useEntries();
  const entries = entriesQuery.data ?? [];
  const entry = entries.find((value) => value.date === selectedDate);
  const openEditor = () => router.push(`/day/${selectedDate}`);

  // Without the saved entries an existing day would be offered as a new one.
  if (entriesQuery.isPending) return <LoadingState />;
  if (entriesQuery.isError) {
    return <ErrorState message={t.today.error} onRetry={() => void entriesQuery.refetch()} />;
  }

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="title">{t.log.title}</Typography>
          <Typography muted>{t.log.subtitle}</Typography>
        </View>
        <Ionicons name="add-circle-outline" size={32} color={theme.colors.primary} />
      </View>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} entries={entries} />

      <Card tone="primary" style={styles.mainCard}>
        <Typography variant="caption" muted>
          {formatDate(selectedDate).toUpperCase()}
        </Typography>
        <Typography variant="heading">{entry ? t.log.editHeading : t.log.newHeading}</Typography>
        <Typography muted>{t.log.body}</Typography>
        <Button
          label={entry ? t.entry.open : t.log.start}
          icon="create-outline"
          onPress={openEditor}
        />
      </Card>

      <SectionHeader title={t.log.categories} subtitle={t.log.categoriesSubtitle} />
      <View style={styles.categoryList}>
        {categories(t).map((category) => {
          const color = theme.colors[category.color];
          return (
            <Pressable
              key={category.key}
              accessibilityRole="button"
              accessibilityLabel={category.title}
              accessibilityHint={category.body}
              onPress={openEditor}
              style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
            >
              <Card style={styles.categoryCard}>
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
            </Pressable>
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
