import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing, useCyklaTheme } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

export function LoadingState({ label }: { label?: string }) {
  const theme = useCyklaTheme();
  const { t } = useI18n();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.colors.primary} />
      <Typography muted>{label ?? t.states.loading}</Typography>
    </View>
  );
}

export function ErrorState({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.state}>
      <Typography variant="heading">{t.states.errorTitle}</Typography>
      <Typography muted>{message ?? t.states.error}</Typography>
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
