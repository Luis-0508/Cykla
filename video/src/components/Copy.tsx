import type { ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';
import { span, easeInOut } from '../theme';

/** Left text column beside the phone. Lines rise in one after another and fade out together. */
export const COPY = { left: 170, width: 700 };

export function CopyBlock({
  top,
  start,
  end,
  lines,
  stagger = 8,
}: {
  top: number;
  start: number;
  end: number;
  lines: ReactNode[];
  stagger?: number;
}) {
  const f = useCurrentFrame();
  const out = span(f, end - 14, end, easeInOut);
  return (
    <div style={{ position: 'absolute', left: COPY.left, top, width: COPY.width }}>
      {lines.map((line, i) => {
        const p = span(f, start + i * stagger, start + i * stagger + 20);
        return (
          <div
            key={i}
            style={{
              opacity: p * (1 - out),
              transform: `translateY(${(1 - p) * 18 - out * 8}px)`,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}
