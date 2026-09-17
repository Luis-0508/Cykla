import { de } from '@/i18n/de';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

export function LoadingState({ label = de.states.loading }: { label?: string }) {
  const theme = useCyklaTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.colors.primary} />
      <Typography muted>{label}</Typography>
    </View>
  );
}

export function ErrorState({ message = de.states.error }: { message?: string }) {
  return (
    <View style={styles.state}>
      <Typography variant="heading">{de.states.errorTitle}</Typography>
      <Typography muted>{message}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
