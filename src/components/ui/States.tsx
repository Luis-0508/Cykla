import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

export function LoadingState({ label = 'Wird geladen …' }: { label?: string }) {
  const theme = useCyklaTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.colors.primary} />
      <Typography muted>{label}</Typography>
    </View>
  );
}

export function ErrorState({ message = 'Etwas ist schiefgegangen.' }: { message?: string }) {
  return (
    <View style={styles.state}>
      <Typography variant="heading">Das hat nicht geklappt</Typography>
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
