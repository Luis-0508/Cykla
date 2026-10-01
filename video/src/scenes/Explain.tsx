import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Est, Eyebrow, Ground, Headline } from '../components/Brand';
import { Capture } from '../components/Capture';
import { CopyBlock } from '../components/Copy';
import { CrescentWipe } from '../components/CrescentWipe';
import { Phone } from '../components/Phone';
import { DARK, F, span } from '../theme';

/**
 * 0:24 — Night falls through the crescent of the mark. The calendar turns dark,
 * then the real explanation screen scrolls while, beside it, the recorded
 * period starts become a timeline and the timeline becomes a range.
 */
export const EXPLAIN_FRAMES = 262;
export const WIPE_FRAMES = 38;

// Capture frame = (scene frame - SWITCH) * SPEED once the explanation is on screen.
const SWITCH = 66;
const SPEED = 1.25;

export function Explain() {
  const f = useCurrentFrame();
  const wipe = span(f, 0, WIPE_FRAMES);
  const toExplain = span(f, SWITCH - 6, SWITCH + 6);
  const capFrame = (sceneFrame: number) => Math.max(0, (sceneFrame - SWITCH) * SPEED);
  return (
    <CrescentWipe p={wipe} cx={1700} cy={130}>
      <Ground dark>
        <CopyBlock
          top={200}
          start={36}
          end={EXPLAIN_FRAMES + 30}
          lines={[
            <Eyebrow key="e" color={DARK.accent} style={{ marginBottom: 22 }}>
              Transparent model
            </Eyebrow>,
            <Headline key="h" palette={DARK} size={84}>
              Every <Est color={DARK.period} p={span(f, 52, 72)}>estimate</Est>
              <br />
              explains itself.
            </Headline>,
          ]}
        />
        <Timeline />
        <Phone dark>
          <Capture shot="calendarDark" />
          <div style={{ position: 'absolute', inset: 0, opacity: toExplain }}>
            <Capture shot="explain" at={[[SWITCH, capFrame(SWITCH)], [EXPLAIN_FRAMES, capFrame(EXPLAIN_FRAMES)]]} />
          </div>
        </Phone>
      </Ground>
    </CrescentWipe>
  );
}

// --- Timeline: synthetic data from scripts/demo-data.mjs, model from src/domain/prediction.ts.
const STARTS = ['2026-05-11', '2026-06-09', '2026-07-06', '2026-08-05', '2026-09-02', '2026-10-01'];
const PERIOD_DAYS = [4, 4, 5, 4, 4, 5]; // light–heavy days recorded per period (spotting excluded)
const LENGTHS = [29, 27, 30, 28, 29];
const EXPECTED = '2026-10-30';
const WINDOW: [string, string] = ['2026-10-27', '2026-11-02'];

const T0 = Date.UTC(2026, 4, 1); // May 1
const X0 = 172;
const PX_PER_DAY = 4.4;
const AXIS_Y = 712;
const day = (iso: string) => (Date.parse(`${iso}T00:00:00Z`) - T0) / 86_400_000;
const x = (iso: string) => X0 + day(iso) * PX_PER_DAY;
const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

function Timeline() {
  const f = useCurrentFrame();
  const axis = span(f, 84, 110);
  const projection = span(f, 172, 202);
  const range = span(f, 194, 222);
  const label = span(f, 208, 228);
  const dim = 1 - 0.4 * span(f, 172, 196); // history recedes as the estimate appears
  const width = day('2026-11-08') * PX_PER_DAY;
  const xs = x(STARTS[5]);
  const xe = x(EXPECTED);
  const r0 = x(WINDOW[0]) - 9;
  const r1 = x(WINDOW[1]) + 9;
  const arcH = 120;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <line x1={X0} y1={AXIS_Y} x2={X0 + width * axis} y2={AXIS_Y} stroke={DARK.border} strokeWidth={2} />
        {MONTHS.map((month, i) => {
          const mx = x(`2026-${String(5 + i).padStart(2, '0')}-01`);
          return (
            <g key={month} opacity={axis}>
              <line x1={mx} y1={AXIS_Y - 7} x2={mx} y2={AXIS_Y + 7} stroke={DARK.border} strokeWidth={2} />
              <text x={mx + 7} y={AXIS_Y + 36} fill={DARK.muted} fontFamily={F.sans} fontSize={20} opacity={0.75}>
                {month}
              </text>
            </g>
          );
        })}
        {/* Arcs between recorded starts: complete cycles, with their lengths. */}
        {LENGTHS.map((length, i) => {
          const a = x(STARTS[i]);
          const b = x(STARTS[i + 1]);
          const p = span(f, 116 + i * 7, 136 + i * 7);
          const h = 58;
          const d = `M ${a} ${AXIS_Y - 16} Q ${(a + b) / 2} ${AXIS_Y - 16 - h * 2} ${b} ${AXIS_Y - 16}`;
          return (
            <g key={i} opacity={p * dim}>
              <path d={d} fill="none" stroke={DARK.muted} strokeWidth={1.6} opacity={0.5} />
              <text x={(a + b) / 2} y={AXIS_Y - 16 - h - 16} fill={DARK.text} fontFamily={F.sans} fontWeight={500} fontSize={27} textAnchor="middle">
                {length}
              </text>
            </g>
          );
        })}
        {/* Recorded bleeding days: solid, one dot per entered day. */}
        {STARTS.map((start, i) =>
          Array.from({ length: PERIOD_DAYS[i] }, (_, k) => {
            const p = span(f, 96 + i * 5 + k, 108 + i * 5 + k);
            return <circle key={`${i}-${k}`} cx={x(start) + k * PX_PER_DAY} cy={AXIS_Y} r={6.5 * p} fill={DARK.period} />;
          }),
        )}
        {/* Projection: the weighted cycle length carried forward, dashed. */}
        <clipPath id="projection-reveal">
          <rect x={xs - 10} y={0} width={(xe - xs + 20) * projection} height={1080} />
        </clipPath>
        <path
          clipPath="url(#projection-reveal)"
          d={`M ${xs} ${AXIS_Y - 16} Q ${(xs + xe) / 2} ${AXIS_Y - 16 - arcH * 2} ${xe} ${AXIS_Y - 20}`}
          fill="none"
          stroke={DARK.period}
          strokeWidth={2.4}
          strokeDasharray="8 7"
        />
        <text x={(xs + xe) / 2} y={AXIS_Y - 16 - arcH - 18} fill={DARK.period} fontFamily={F.serif} fontStyle="italic" fontSize={44} textAnchor="middle" opacity={projection}>
          ≈ 29
        </text>
        {/* Range: the window around the expected start, drawn like the app's dashed cells. */}
        <clipPath id="range-reveal">
          <rect x={(r0 + r1) / 2 - ((r1 - r0) / 2 + 4) * range} y={0} width={(r1 - r0 + 8) * range} height={1080} />
        </clipPath>
        <rect
          clipPath="url(#range-reveal)"
          x={r0}
          y={AXIS_Y - 17}
          width={r1 - r0}
          height={34}
          rx={17}
          fill={DARK.period}
          fillOpacity={0.14}
          stroke={DARK.period}
          strokeWidth={2.4}
          strokeDasharray="6 5"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          right: 1920 - r1,
          top: AXIS_Y + 58,
          textAlign: 'right',
          opacity: label,
          transform: `translateY(${(1 - label) * 10}px)`,
        }}
      >
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 27, color: DARK.text }}>Oct 27 – Nov 2</div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
            padding: '7px 18px',
            borderRadius: 999,
            border: `1.5px solid ${DARK.accent}`,
            fontFamily: F.sans,
            fontSize: 20,
            color: DARK.text,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 10, background: DARK.accent }} />
          Medium confidence
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: X0,
          top: AXIS_Y + 58,
          fontFamily: F.sans,
          fontSize: 23,
          lineHeight: 1.5,
          color: DARK.muted,
          opacity: span(f, 120, 140),
        }}
      >
        <span style={{ color: DARK.text, fontWeight: 600 }}>6 recorded starts</span> · 5 complete cycles
        <br />
        recent cycles weigh a little more
      </div>
    </div>
  );
}
