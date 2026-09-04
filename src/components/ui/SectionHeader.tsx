import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/theme';
import { Typography } from '@/components/ui/Typography';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Typography variant="heading">{title}</Typography>
      {subtitle ? (
        <Typography muted style={styles.subtitle}>
          {subtitle}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  subtitle: {
    maxWidth: 560,
  },
});
