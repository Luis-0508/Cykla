import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DashedRing, Est, Headline, Sub } from '../components/Brand';
import { Capture, META, type Box } from '../components/Capture';
import { CopyBlock } from '../components/Copy';
import { Phone } from '../components/Phone';
import { BRAND, F, LIGHT, easeInOut, keys, span } from '../theme';

/**
 * 0:18 — Cykla estimates. The real October calendar: filled days were entered,
 * the dashed ring is the prediction window, the soft wash a possible fertile
 * window. Highlights are drawn on the real cells (positions from the capture).
 */
export const ESTIMATES_FRAMES = 200;

const boxes = META.calendar.boxes;
const pick = (prefix: string) =>
  Object.entries(boxes)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, box]) => box);

const GROUPS = {
  period: { cells: pick('period'), start: 34 },
  window: { cells: pick('window'), start: 74 },
  fertile: { cells: pick('fertile'), start: 114 },
};

export function Estimates() {
  const f = useCurrentFrame();
  const [s, fx, fy] = keys(f, [
    [0, 1, 195, 422],
    [20, 1, 195, 422],
    [70, 1.2, 195, 400],
    [150, 1.24, 195, 400],
    [184, 1, 195, 422],
  ]);
  const leave = 1 - span(f, 160, 180, easeInOut);
  return (
    <AbsoluteFill>
      <CopyBlock
        top={230}
        start={6}
        end={184}
        lines={[
          <Headline key="h" palette={LIGHT}>
            Cykla <Est color={BRAND.period} p={span(f, 18, 40)}>estimates</Est>.
          </Headline>,
          <Sub key="s" palette={LIGHT} style={{ marginTop: 22, maxWidth: 600 }}>
            A range with a confidence level — never a promised day.
          </Sub>,
        ]}
      />
      <div style={{ position: 'absolute', left: 172, top: 530, opacity: leave }}>
        <Legend at={GROUPS.period.start} icon={<Dot color={BRAND.period} />} title="Recorded period">
          Oct 1 – 5 · entered by you
        </Legend>
        <Legend at={GROUPS.window.start} icon={<DashedRing r={13} p={1} color={BRAND.period} width={2.4} dash={5} />} title="Prediction window">
          Oct 27 – Nov 2 · ±3 days · medium confidence
        </Legend>
        <Legend at={GROUPS.fertile.start} icon={<Dot color={BRAND.fertileSoft} ring={BRAND.fertile} />} title="Possible fertile window">
          a rough estimate — never a list of safe days
        </Legend>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 172,
          top: 948,
          width: 640,
          fontFamily: F.sans,
          fontSize: 19,
          lineHeight: 1.45,
          color: LIGHT.muted,
          opacity: span(f, 130, 150) * leave,
        }}
      >
        Calendar data cannot reliably determine fertility. Cykla is not a method of contraception.
      </div>
      <Phone camera={{ s, fx, fy }}>
        <div style={{ position: 'absolute', inset: 0, opacity: span(f, 0, 10) }}>
          <Capture shot="calendar" />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: leave }}>
          {GROUPS.period.cells.map((box, i) => (
            <Halo key={`p${i}`} box={box} p={span(f, GROUPS.period.start + i * 3, GROUPS.period.start + 16 + i * 3)} kind="solid" />
          ))}
          {GROUPS.window.cells.map((box, i) => (
            <Halo key={`w${i}`} box={box} p={span(f, GROUPS.window.start + i * 3, GROUPS.window.start + 22 + i * 3)} kind="dashed" />
          ))}
          {GROUPS.fertile.cells.map((box, i) => (
            <Halo key={`f${i}`} box={box} p={span(f, GROUPS.fertile.start + i * 3, GROUPS.fertile.start + 16 + i * 3)} kind="soft" />
          ))}
        </div>
      </Phone>
    </AbsoluteFill>
  );
}

function Dot({ color, ring }: { color: string; ring?: string }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: color,
        boxShadow: ring ? `inset 0 0 0 1.5px ${ring}55` : undefined,
      }}
    />
  );
}

function Legend({ at, icon, title, children }: { at: number; icon: ReactNode; title: string; children: ReactNode }) {
  const f = useCurrentFrame();
  const p = span(f, at, at + 18);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginBottom: 34,
        opacity: p,
        transform: `translateX(${(1 - p) * -16}px)`,
      }}
    >
      <div style={{ width: 32, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 27, color: LIGHT.text }}>{title}</div>
        <div style={{ fontFamily: F.sans, fontSize: 21, color: LIGHT.muted, marginTop: 4 }}>{children}</div>
      </div>
    </div>
  );
}

/** A ring drawn around a real calendar cell, in the cell's own visual language. */
function Halo({ box, p, kind }: { box: Box; p: number; kind: 'solid' | 'dashed' | 'soft' }) {
  if (p <= 0) return null;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 - 3; // the day circle sits above the symptom dot
  const r = 24.5;
  if (kind === 'dashed') {
    // The cells are dashed already; a soft period tint marks them without doubling the dashes.
    return (
      <div
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          background: BRAND.periodSoft,
          mixBlendMode: 'multiply',
          opacity: p,
          transform: `scale(${0.7 + 0.3 * p})`,
        }}
      />
    );
  }
  const color = kind === 'solid' ? BRAND.period : BRAND.fertile;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `1.6px solid ${color}`,
        opacity: p * (kind === 'soft' ? 0.55 : 0.9),
        transform: `scale(${1.25 - 0.25 * p})`,
      }}
    />
  );
}
