import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useCyklaTheme } from '@/theme/theme';

// Horizontal padding of screen content; full-width children are this much narrower.
export const SCREEN_GUTTER = spacing.lg;

type AppScreenProps = PropsWithChildren<{
  header?: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}>;

export function AppScreen({
  children,
  header,
  scroll = true,
  contentContainerStyle,
}: AppScreenProps) {
  const theme = useCyklaTheme();
  const content = (
    <View style={styles.grow}>
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.grow, contentContainerStyle]}>{children}</View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.grow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 120,
  },
});
