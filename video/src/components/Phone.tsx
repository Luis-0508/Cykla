import type { CSSProperties, ReactNode } from 'react';
import { PHONE, SCREEN } from '../theme';

export type Camera = { s: number; fx: number; fy: number };

/**
 * A quiet, generic phone body around a 390×844 screen. `camera` scales the
 * whole device about a point given in screen CSS px (a push-in on the UI).
 * `screen` children render in screen CSS px.
 */
export function Phone({
  children,
  camera = { s: 1, fx: SCREEN.w / 2, fy: SCREEN.h / 2 },
  dx = 0,
  dy = 0,
  dark = false,
  style,
}: {
  children: ReactNode;
  camera?: Camera;
  dx?: number;
  dy?: number;
  dark?: boolean;
  style?: CSSProperties;
}) {
  const sw = SCREEN.w * PHONE.scale;
  const sh = SCREEN.h * PHONE.scale;
  const bw = sw + PHONE.bezel * 2;
  const bh = sh + PHONE.bezel * 2;
  const left = PHONE.cx - bw / 2 + dx;
  const top = PHONE.cy - bh / 2 + dy;
  // Focal point in device coordinates.
  const ox = PHONE.bezel + camera.fx * PHONE.scale;
  const oy = PHONE.bezel + camera.fy * PHONE.scale;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: bw,
        height: bh,
        transformOrigin: `${ox}px ${oy}px`,
        transform: `scale(${camera.s})`,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 64,
          background: dark ? '#0d080c' : '#21151e',
          boxShadow: dark
            ? '0 50px 120px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,248,252,0.10), inset 0 0 0 1.5px rgba(255,255,255,0.06)'
            : '0 60px 120px rgba(53,23,47,0.22), 0 18px 40px rgba(53,23,47,0.14), inset 0 0 0 1.5px rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: PHONE.bezel,
          top: PHONE.bezel,
          width: sw,
          height: sh,
          borderRadius: 52,
          overflow: 'hidden',
          background: dark ? '#1E1420' : '#F8F4EF',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: SCREEN.w,
            height: SCREEN.h,
            transformOrigin: '0 0',
            transform: `scale(${PHONE.scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
