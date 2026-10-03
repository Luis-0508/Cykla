import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityHint?: string;
  // Shows only the icon; the label stays the accessibility label.
  iconOnly?: boolean;
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
  accessibilityHint,
  iconOnly = false,
}: ButtonProps) {
  const theme = useCyklaTheme();
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const backgroundColor = primary
    ? theme.colors.primary
    : danger
      ? theme.colors.danger
      : variant === 'secondary'
        ? theme.colors.surface
        : 'transparent';
  const color = primary || danger ? theme.colors.surfaceRaised : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        iconOnly && styles.iconOnly,
        {
          backgroundColor,
          borderColor: variant === 'secondary' ? theme.colors.border : backgroundColor,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} color={color} size={iconOnly ? 24 : 19} /> : null}
          {iconOnly ? null : (
            <Typography variant="label" style={[styles.label, { color }]}>
              {label}
            </Typography>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnly: {
    minWidth: 52,
    paddingHorizontal: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  // Long translations wrap inside the button instead of overflowing it.
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
