import { StyleSheet, View } from 'react-native';
import type { Confidence } from '@/domain/models';
import { de } from '@/i18n/de';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const theme = useCyklaTheme();
  const color =
    confidence === 'high'
      ? theme.colors.fertile
      : confidence === 'medium'
        ? theme.colors.accent
        : theme.colors.textMuted;
  return (
    <View
      accessibilityLabel={de.confidence[confidence]}
      style={[styles.badge, { borderColor: color }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Typography variant="caption">{de.confidence[confidence]}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 8,
  },
});
