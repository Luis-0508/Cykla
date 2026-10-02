import { Img, staticFile, useCurrentFrame } from 'remotion';
import calendar from '../../public/captures/calendar.json';
import calendarDark from '../../public/captures/calendarDark.json';
import explain from '../../public/captures/explain.json';
import onboarding from '../../public/captures/onboarding.json';
import privacy from '../../public/captures/privacy.json';
import record from '../../public/captures/record.json';
import { SCREEN, span } from '../theme';

export type Box = { x: number; y: number; w: number; h: number };
type Tap = { frame: number; x: number; y: number };
type Meta = { frames: number; scheme: string; taps: Tap[]; boxes: Record<string, Box> };

export const META = { onboarding, record, calendar, calendarDark, explain, privacy } as Record<
  string,
  Meta
>;
export type ShotName = 'onboarding' | 'record' | 'calendar' | 'calendarDark' | 'explain' | 'privacy';

/** Maps a scene frame to a capture frame through [sceneFrame, captureFrame] pairs (linear). */
export function timeMap(frame: number, pairs: [number, number][]) {
  if (frame <= pairs[0][0]) return pairs[0][1];
  for (let i = 1; i < pairs.length; i++) {
    const [s1, c1] = pairs[i];
    const [s0, c0] = pairs[i - 1];
    if (frame <= s1) return c0 + ((frame - s0) / (s1 - s0)) * (c1 - c0);
  }
  return pairs[pairs.length - 1][1];
}

/**
 * One captured frame of the real app at screen size (390×844 CSS px), with a
 * soft touch indicator drawn where the capture tapped.
 */
export function Capture({ shot, at }: { shot: ShotName; at?: [number, number][] }) {
  const frame = useCurrentFrame();
  const meta = META[shot];
  const raw = at ? timeMap(frame, at) : frame;
  const index = Math.max(0, Math.min(meta.frames - 1, Math.round(raw)));
  return (
    <div style={{ position: 'absolute', inset: 0, width: SCREEN.w, height: SCREEN.h }}>
      <Img
        src={staticFile(`captures/${shot}/${String(index).padStart(4, '0')}.jpg`)}
        style={{ width: SCREEN.w, height: SCREEN.h, display: 'block' }}
      />
      {meta.taps.map((tap) => (
        <Touch key={tap.frame} tap={tap} at={raw} dark={meta.scheme === 'dark'} />
      ))}
    </div>
  );
}

function Touch({ tap, at, dark }: { tap: Tap; at: number; dark: boolean }) {
  const before = 9;
  const after = 16;
  if (at < tap.frame - before || at > tap.frame + after) return null;
  const press = span(at, tap.frame - before, tap.frame);
  const release = span(at, tap.frame, tap.frame + after);
  const size = 46 * (1 - 0.18 * press) * (1 + 0.5 * release);
  const opacity = press * (1 - release);
  const ink = dark ? '255, 248, 252' : '90, 40, 79';
  return (
    <div
      style={{
        position: 'absolute',
        left: tap.x - size / 2,
        top: tap.y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `rgba(${ink}, ${0.16 * opacity})`,
        border: `1.5px solid rgba(${ink}, ${0.5 * opacity})`,
      }}
    />
  );
}
