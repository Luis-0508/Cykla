import { evolvePath } from '@remotion/paths';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { BRAND, F, type Palette } from '../theme';

/** The Cykla mark (docs/images/cykla-mark.svg): plum disc, apricot crescent, lavender dot. */
export function Mark({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={style}>
      <defs>
        <clipPath id="cykla-disc">
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>
      <g clipPath="url(#cykla-disc)">
        <circle cx="48" cy="48" r="48" fill={BRAND.plum} />
        <circle cx="66.24" cy="35.52" r="37.44" fill={BRAND.apricot} />
        <circle cx="22.56" cy="75.36" r="8.16" fill={BRAND.lavenderSoft} />
      </g>
    </svg>
  );
}

/** A dashed ring that draws itself (p: 0→1), like the app's prediction window cells. */
export function DashedRing({
  r,
  p,
  color,
  width = 3,
  dash = 7,
}: {
  r: number;
  p: number;
  color: string;
  width?: number;
  dash?: number;
}) {
  const size = r * 2 + width * 2;
  const c = size / 2;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r}`;
  const reveal = evolvePath(p, d);
  return (
    <svg width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      <mask id={`ring-${r}-${Math.round(p * 1000)}`}>
        <path
          d={d}
          stroke="#fff"
          strokeWidth={width + 2}
          fill="none"
          strokeDasharray={reveal.strokeDasharray}
          strokeDashoffset={reveal.strokeDashoffset}
        />
      </mask>
      <path
        d={d}
        stroke={color}
        strokeWidth={width}
        fill="none"
        strokeDasharray={`${dash} ${dash * 0.75}`}
        strokeLinecap="round"
        mask={`url(#ring-${r}-${Math.round(p * 1000)})`}
      />
    </svg>
  );
}

/** Paper ground: the app background with a faint grain and a soft vignette. */
export function Ground({ dark = false, children }: { dark?: boolean; children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: dark ? BRAND.aubergine : BRAND.offWhite }}>
      <AbsoluteFill style={{ opacity: dark ? 0.08 : 0.07, mixBlendMode: dark ? 'screen' : 'multiply' }}>
        <svg width="100%" height="100%">
          <filter id={dark ? 'grain-dark' : 'grain'}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${dark ? 'grain-dark' : 'grain'})`} />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: dark
            ? 'radial-gradient(ellipse 80% 80% at 60% 45%, rgba(73,50,78,0.35) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 80% 80% at 50% 45%, transparent 55%, rgba(90,40,79,0.06) 100%)',
        }}
      />
      {children}
    </AbsoluteFill>
  );
}

/**
 * Editorial headline. Upright words are things that happened; words wrapped in
 * <Est> are set in italic with a dashed underline — the estimated register.
 */
export function Headline({
  children,
  palette,
  size = 92,
  style,
}: {
  children: ReactNode;
  palette: Palette;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: F.serif,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -1,
        color: palette.heading,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Est({ children, color, p = 1 }: { children: ReactNode; color: string; p?: number }) {
  return (
    <span style={{ fontStyle: 'italic', position: 'relative', display: 'inline-block' }}>
      {children}
      <span
        style={{
          position: 'absolute',
          left: '4%',
          right: '6%',
          bottom: '0.02em',
          height: 3,
          backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 10px, transparent 10px 17px)`,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          opacity: 0.85,
        }}
      />
    </span>
  );
}

export function Sub({
  children,
  palette,
  style,
}: {
  children: ReactNode;
  palette: Palette;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: F.sans,
        fontSize: 30,
        lineHeight: 1.4,
        color: palette.muted,
        letterSpacing: -0.1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small caps label, like the app's eyebrows (ESTIMATE, RECORDED). */
export function Eyebrow({ children, color, style }: { children: ReactNode; color: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: 21,
        letterSpacing: 3.2,
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
