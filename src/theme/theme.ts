import { useColorScheme } from 'react-native';
import { BRAND } from '@/config/branding';
import { useUiStore } from '@/store/uiStore';

export const lightTheme = {
  dark: false,
  colors: {
    background: BRAND.colors.offWhite,
    surface: '#FFFCF9',
    surfaceRaised: '#FFFFFF',
    text: '#2B2028',
    textMuted: '#74666F',
    border: '#E9E0E3',
    primary: BRAND.colors.plum,
    primarySoft: BRAND.colors.lavenderSoft,
    accent: BRAND.colors.apricot,
    accentSoft: BRAND.colors.apricotSoft,
    period: BRAND.colors.period,
    periodSoft: BRAND.colors.periodSoft,
    fertile: BRAND.colors.fertile,
    fertileSoft: BRAND.colors.fertileSoft,
    danger: '#A23B45',
    overlay: 'rgba(35, 22, 32, 0.42)',
  },
} as const;

export const darkTheme = {
  dark: true,
  colors: {
    background: BRAND.colors.aubergine,
    surface: '#2A1C2B',
    surfaceRaised: '#342337',
    text: '#FFF8FC',
    textMuted: '#CDBFC8',
    border: '#4A354A',
    primary: '#D6B5D3',
    primarySoft: '#49324E',
    accent: '#F3B58E',
    accentSoft: '#493126',
    period: '#F08AA1',
    periodSoft: '#4F2934',
    fertile: '#66CDBF',
    fertileSoft: '#1D4541',
    danger: '#FF9CA5',
    overlay: 'rgba(12, 7, 13, 0.72)',
  },
} as const;

export type CyklaTheme = typeof lightTheme | typeof darkTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

// Width from which text labels fit beside compact controls (tablets, desktop web).
export const WIDE_LAYOUT_MIN_WIDTH = 600;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export function useCyklaTheme(): CyklaTheme {
  const systemScheme = useColorScheme();
  const mode = useUiStore((state) => state.themeMode);
  const dark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  return dark ? darkTheme : lightTheme;
}
