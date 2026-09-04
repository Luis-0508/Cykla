import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useCyklaTheme } from '@/theme/theme';

type TypographyProps = PropsWithChildren<
  TextProps & {
    variant?: 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';
    muted?: boolean;
  }
>;

export function Typography({
  variant = 'body',
  muted = false,
  style,
  children,
  ...props
}: TypographyProps) {
  const theme = useCyklaTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...props}
      style={
        [
          styles.base,
          styles[variant],
          { color: muted ? theme.colors.textMuted : theme.colors.text },
          style,
        ] as StyleProp<TextStyle>
      }
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: undefined,
  },
  display: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
