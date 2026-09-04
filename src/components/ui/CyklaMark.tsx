import { StyleSheet, View } from 'react-native';
import { BRAND } from '@/config/branding';

type CyklaMarkProps = {
  size?: number;
};

export function CyklaMark({ size = 48 }: CyklaMarkProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Abstrakte Cykla-Mondsichel"
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: BRAND.colors.plum,
        },
      ]}
    >
      <View
        style={[
          styles.cutout,
          {
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: size,
            backgroundColor: BRAND.colors.apricot,
            right: -size * 0.08,
            top: -size * 0.02,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size * 0.17,
            height: size * 0.17,
            borderRadius: size,
            backgroundColor: BRAND.colors.lavenderSoft,
            left: size * 0.15,
            bottom: size * 0.13,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  cutout: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
  },
});
