import { loadFont as loadDmSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { Easing, interpolate } from 'remotion';

const serif = loadSerif('normal', { weights: ['400'], subsets: ['latin'] });
loadSerif('italic', { weights: ['400'], subsets: ['latin'] });
const sans = loadDmSans('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

export const F = {
  serif: serif.fontFamily,
  sans: sans.fontFamily,
};

/** Brand and theme colours, copied from src/config/branding.json and src/theme/theme.ts. */
export const BRAND = {
  plum: '#5A284F',
  plumDeep: '#35172F',
  lavender: '#A991BC',
  lavenderSoft: '#E9DFEC',
  apricot: '#F3A97E',
  apricotSoft: '#FCE4D5',
  fertile: '#2A9D8F',
  fertileSoft: '#D8F0EB',
  period: '#9D3F56',
  periodSoft: '#F4DCE2',
  offWhite: '#F8F4EF',
  aubergine: '#1E1420',
};

export const LIGHT = {
  bg: BRAND.offWhite,
  text: '#2B2028',
  heading: BRAND.plumDeep,
  muted: '#74666F',
  border: '#E9E0E3',
  period: BRAND.period,
  fertile: BRAND.fertile,
  fertileSoft: BRAND.fertileSoft,
  accent: BRAND.apricot,
};

export const DARK = {
  bg: BRAND.aubergine,
  text: '#FFF8FC',
  heading: '#FFF8FC',
  muted: '#CDBFC8',
  border: '#4A354A',
  period: '#F08AA1',
  fertile: '#66CDBF',
  fertileSoft: '#1D4541',
  accent: '#F3B58E',
};

export type Palette = typeof LIGHT;

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** Phone screen (CSS px of the capture) and where the device sits in the frame. */
export const SCREEN = { w: 390, h: 844 };
export const PHONE = {
  scale: 1.04, // screen CSS px → frame px
  bezel: 13,
  cx: 1310, // centre of the device in the frame
  cy: 540,
};

export const ease = Easing.bezier(0.22, 0.8, 0.24, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0→1 over [a, b] with the house easing. */
export function span(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { ...clamp, easing });
}

/** Fade in over [a, a+d] and out over [b-d, b]. */
export function inOut(frame: number, a: number, b: number, d = 14) {
  return Math.min(span(frame, a, a + d), 1 - span(frame, b - d, b, easeInOut));
}

/** Piecewise eased interpolation of numeric tuples over keyframes [frame, ...values]. */
export function keys(frame: number, frames: number[][]): number[] {
  if (frame <= frames[0][0]) return frames[0].slice(1);
  for (let i = 1; i < frames.length; i++) {
    const [f1, ...b] = frames[i];
    const [f0, ...a] = frames[i - 1];
    if (frame <= f1) {
      const t = easeInOut((frame - f0) / Math.max(1, f1 - f0));
      return a.map((v, j) => v + (b[j] - v) * t);
    }
  }
  return frames[frames.length - 1].slice(1);
}
