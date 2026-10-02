import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { ROADMAP_PHASES, type RoadmapPhase, type RoadmapStage } from '@/config/roadmap';
import { useI18n } from '@/i18n/I18nProvider';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

// The roadmap borrows the calendar's vocabulary: shipped work is drawn solid like
// recorded days, plans are dashed and dotted like estimates.

const NODE_SIZE: Record<RoadmapStage, number> = { released: 18, now: 26, next: 18, later: 14 };
const COMPACT_NODE_SIZE: Record<RoadmapStage, number> = {
  released: 14,
  now: 16,
  next: 14,
  later: 14,
};
const DOTS = Array.from({ length: 160 }, (_, index) => index);

export function RoadmapNode({
  stage,
  compact = false,
}: {
  stage: RoadmapStage;
  compact?: boolean;
}) {
  const theme = useCyklaTheme();
  const size = (compact ? COMPACT_NODE_SIZE : NODE_SIZE)[stage];
  const circle = { width: size, height: size, borderRadius: radii.pill };

  if (stage === 'released') {
    return (
      <View style={[styles.node, circle, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="checkmark" size={size * 0.66} color={theme.colors.surfaceRaised} />
      </View>
    );
  }
  if (stage === 'now') {
    const core = Math.round(size * 0.46);
    return (
      <View style={[styles.node, circle]}>
        {compact ? null : <NowHalo size={size} />}
        <View
          style={[
            styles.node,
            circle,
            {
              borderWidth: 2,
              borderColor: theme.colors.accent,
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          <View
            style={{
              width: core,
              height: core,
              borderRadius: radii.pill,
              backgroundColor: theme.colors.primary,
            }}
          />
        </View>
      </View>
    );
  }
  return (
    <View
      style={[
        circle,
        {
          borderWidth: stage === 'next' ? 2 : 1.5,
          borderStyle: 'dashed',
          borderColor: stage === 'next' ? theme.colors.primary : theme.colors.textMuted,
          backgroundColor: theme.colors.background,
        },
      ]}
    />
  );
}

// The only ambient motion on the screen: a slow halo marking the current phase.
function NowHalo({ size }: { size: number }) {
  const theme = useCyklaTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.set(
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1),
    );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - progress.get()),
    transform: [{ scale: 1 + 0.75 * progress.get() }],
  }));

  if (reduceMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        { width: size, height: size, backgroundColor: theme.colors.accent },
        animatedStyle,
      ]}
    />
  );
}

function Spine({ solid }: { solid: boolean }) {
  const theme = useCyklaTheme();
  if (solid) {
    return <View style={[styles.spine, styles.solid, { backgroundColor: theme.colors.primary }]} />;
  }
  return (
    // The dots sit in an absolute layer so they fill the row instead of sizing it.
    <View style={[styles.spine, styles.dotted]}>
      <View style={styles.dotLayer}>
        {DOTS.map((index) => (
          <View key={index} style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
        ))}
      </View>
    </View>
  );
}

export function RoadmapTimeline() {
  return (
    <View>
      {ROADMAP_PHASES.map((phase, index) => (
        <PhaseRow key={phase.id} phase={phase} nextStage={ROADMAP_PHASES[index + 1]?.stage} />
      ))}
    </View>
  );
}

function PhaseRow({ phase, nextStage }: { phase: RoadmapPhase; nextStage?: RoadmapStage }) {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const copy = t.roadmap.phases[phase.id];
  const stageLabel = t.roadmap.stage[phase.stage];
  const isNow = phase.stage === 'now';
  const isReleased = phase.stage === 'released';
  const quiet = isReleased || phase.stage === 'later';
  // Matches the line height of the title row so the node centres on it.
  const headLineHeight = isNow ? 35 : isReleased ? 20 : 26;
  const headVariant = isReleased ? 'label' : 'heading';
  const showItems = !isReleased || expanded;
  // The path stays solid up to the current phase; everything after it is an estimate.
  const solidSpine = nextStage === 'released' || nextStage === 'now';

  const items = (
    <Animated.View entering={isReleased ? FadeIn.duration(220) : undefined} style={styles.items}>
      {phase.items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Ionicons
            name={item.icon}
            size={19}
            color={quiet ? theme.colors.textMuted : theme.colors.primary}
            style={styles.itemIcon}
          />
          <Typography muted={quiet} style={styles.itemText}>
            {t.roadmap.items[item.id]}
          </Typography>
        </View>
      ))}
    </Animated.View>
  );

  return (
    <View style={styles.phase}>
      <View style={styles.gutter}>
        <View style={[styles.nodeSlot, { height: headLineHeight }]}>
          <RoadmapNode stage={phase.stage} />
        </View>
        {nextStage ? <Spine solid={solidSpine} /> : null}
      </View>

      <View style={[styles.body, !nextStage && styles.lastBody]}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={t.roadmap.phaseLabel(phase.version, copy.title, stageLabel)}
          style={styles.titleRow}
        >
          {phase.version ? (
            <Typography
              variant={isNow ? 'title' : headVariant}
              muted={isReleased}
              style={[styles.version, !isReleased && { color: theme.colors.primary }]}
            >
              {phase.version}
            </Typography>
          ) : null}
          <Typography variant={headVariant} muted={isReleased} style={styles.title}>
            {copy.title}
          </Typography>
        </View>

        {isNow ? (
          <Card tone="primary" style={styles.nowCard}>
            <Typography variant="label" style={{ color: theme.colors.primary }}>
              {stageLabel}
            </Typography>
            <Typography>{copy.summary}</Typography>
            {items}
          </Card>
        ) : (
          <>
            <Typography variant="caption" muted>
              {stageLabel}
            </Typography>
            {phase.stage === 'later' ? (
              <View style={styles.note}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.noteIcon}
                />
                <Typography variant="caption" muted style={styles.itemText}>
                  {copy.summary}
                </Typography>
              </View>
            ) : (
              <Typography muted={quiet}>{copy.summary}</Typography>
            )}
            {isReleased ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpanded((value) => !value)}
                hitSlop={4}
                style={({ pressed }) => [styles.disclosure, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Typography variant="label" style={{ color: theme.colors.primary }}>
                  {expanded ? t.roadmap.hideFeatures : t.roadmap.showFeatures(phase.items.length)}
                </Typography>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={17}
                  color={theme.colors.primary}
                />
              </Pressable>
            ) : null}
            {showItems ? items : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderRadius: radii.pill,
  },
  phase: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gutter: {
    width: 32,
    alignItems: 'center',
  },
  nodeSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spine: {
    flex: 1,
    marginVertical: spacing.sm,
  },
  solid: {
    width: 2,
    borderRadius: 1,
  },
  dotted: {
    width: 4,
    overflow: 'hidden',
  },
  dotLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginBottom: 5,
    opacity: 0.55,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  lastBody: {
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  },
  version: {
    fontVariant: ['tabular-nums'],
  },
  title: {
    flexShrink: 1,
  },
  nowCard: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  disclosure: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  items: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemText: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteIcon: {
    marginTop: 1,
  },
});
