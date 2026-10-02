import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { AppScreen } from '@/components/ui/AppScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { RoadmapNode, RoadmapTimeline } from '@/components/RoadmapTimeline';
import { ROADMAP_NOT_PLANNED, type RoadmapStage } from '@/config/roadmap';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

export default function RoadmapScreen() {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  const legend: [RoadmapStage, string][] = [
    ['released', t.roadmap.stage.released],
    ['now', t.roadmap.stage.now],
    ['next', t.roadmap.legendPlanned],
  ];

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.roadmap.close}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/settings');
          }}
          style={[styles.close, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <Typography variant="title" accessibilityRole="header" style={styles.headerText}>
          {t.roadmap.title}
        </Typography>
      </View>

      <View style={styles.intro}>
        <Typography muted>{t.roadmap.intro}</Typography>
        <View style={styles.legend}>
          {legend.map(([stage, label]) => (
            <View key={stage} style={styles.legendItem}>
              <RoadmapNode stage={stage} compact />
              <Typography variant="caption" muted>
                {label}
              </Typography>
            </View>
          ))}
        </View>
      </View>

      <RoadmapTimeline />

      <View style={[styles.notPlanned, { borderTopColor: theme.colors.border }]}>
        <SectionHeader title={t.roadmap.notPlannedTitle} subtitle={t.roadmap.notPlannedSubtitle} />
        {ROADMAP_NOT_PLANNED.map((id) => (
          <View key={id} style={styles.notPlannedItem}>
            <Ionicons
              name="close-circle-outline"
              size={19}
              color={theme.colors.textMuted}
              style={styles.notPlannedIcon}
            />
            <Typography style={styles.notPlannedText}>{t.roadmap.notPlanned[id]}</Typography>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
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
  intro: {
    gap: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notPlanned: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  notPlannedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  notPlannedIcon: {
    marginTop: 2,
  },
  notPlannedText: {
    flex: 1,
  },
});
