import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { BRAND, H, W } from '../theme';

/**
 * The signature transition, taken from the Cykla mark: a disc grows from
 * (cx, cy) and reveals `children`; an apricot crescent rides its leading edge,
 * exactly like the crescent cut into the mark. p: 0→1.
 */
export function CrescentWipe({
  p,
  cx,
  cy,
  children,
}: {
  p: number;
  cx: number;
  cy: number;
  children: ReactNode;
}) {
  if (p <= 0) return null;
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.05;
  const r = p * maxR;
  // Offset of the inner circle, in the direction of the mark's crescent (up-right).
  const off = Math.min(r * 0.2, 90) * (1 - p * 0.6);
  const ox = cx + off * 0.82;
  const oy = cy - off * 0.57;
  const crescent = `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z M ${ox - r} ${oy} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0 Z`;
  return (
    <>
      <AbsoluteFill style={{ clipPath: `circle(${r}px at ${ox}px ${oy}px)` }}>{children}</AbsoluteFill>
      {p < 1 && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <path d={crescent} fill={BRAND.apricot} fillRule="evenodd" opacity={1 - p * 0.35} />
        </svg>
      )}
    </>
  );
}
