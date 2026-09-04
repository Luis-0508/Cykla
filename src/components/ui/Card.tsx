import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radii, spacing, useCyklaTheme } from '@/theme/theme';

type CardProps = PropsWithChildren<{
  style?: ViewStyle | ViewStyle[];
  tone?: 'default' | 'primary' | 'accent' | 'fertile';
}>;

export function Card({ children, style, tone = 'default' }: CardProps) {
  const theme = useCyklaTheme();
  const backgroundColor =
    tone === 'primary'
      ? theme.colors.primarySoft
      : tone === 'accent'
        ? theme.colors.accentSoft
        : tone === 'fertile'
          ? theme.colors.fertileSoft
          : theme.colors.surface;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor: theme.colors.border,
          shadowColor: theme.dark ? '#000000' : '#4B2A40',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
});
