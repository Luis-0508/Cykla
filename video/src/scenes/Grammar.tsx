import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { DashedRing, Est, Headline, Mark, Sub } from '../components/Brand';
import { BRAND, LIGHT, clamp, easeInOut, span } from '../theme';

/**
 * 0:00 — The grammar of the app, before the app: a filled dot (recorded) and a
 * dashed ring (estimated). They stay apart, then settle into the Cykla mark.
 */
export const GRAMMAR_FRAMES = 168;

export function Grammar() {
  const f = useCurrentFrame();
  const dotIn = span(f, 8, 26);
  const ringIn = span(f, 34, 62);
  const words1 = span(f, 14, 30);
  const words2 = span(f, 42, 60);
  const line3 = span(f, 70, 88);
  const out = span(f, 98, 118, easeInOut);
  const markIn = span(f, 108, 132);
  const wordmark = span(f, 118, 140);
  const fadeAll = 1 - span(f, 154, 168, easeInOut);

  // Dot and ring sit apart, then drift toward the centre as the mark appears.
  const gap = interpolate(out, [0, 1], [190, 40], clamp);
  const cy = 470;
  return (
    <AbsoluteFill style={{ opacity: fadeAll }}>
      <div style={{ opacity: 1 - out }}>
        <div
          style={{
            position: 'absolute',
            left: 960 - gap - 44,
            top: cy - 44,
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: BRAND.period,
            transform: `scale(${dotIn})`,
          }}
        />
        <div style={{ position: 'absolute', left: 960 + gap - 48, top: cy - 48 }}>
          <DashedRing r={44} p={ringIn} color={BRAND.period} width={4} dash={10} />
        </div>
        <Headline
          palette={LIGHT}
          size={72}
          style={{
            position: 'absolute',
            left: 960 - gap - 200,
            width: 400,
            textAlign: 'center',
            top: cy + 78,
            transform: `translateY(${(1 - words1) * 16}px)`,
            opacity: words1,
          }}
        >
          Recorded.
        </Headline>
        <Headline
          palette={LIGHT}
          size={72}
          style={{
            position: 'absolute',
            left: 960 + gap - 200,
            width: 400,
            textAlign: 'center',
            top: cy + 78,
            transform: `translateY(${(1 - words2) * 16}px)`,
            opacity: words2,
          }}
        >
          <Est color={BRAND.period} p={span(f, 50, 70)}>
            Estimated.
          </Est>
        </Headline>
        <Sub
          palette={LIGHT}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: cy + 200,
            textAlign: 'center',
            opacity: line3,
            transform: `translateY(${(1 - line3) * 12}px)`,
          }}
        >
          Two different things. Cykla keeps them apart.
        </Sub>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 380,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 34,
        }}
      >
        <Mark
          size={150}
          style={{ opacity: markIn, transform: `scale(${0.82 + 0.18 * markIn}) rotate(${(1 - markIn) * -40}deg)` }}
        />
        <Headline
          palette={LIGHT}
          size={176}
          style={{
            color: BRAND.plum,
            letterSpacing: -3,
            opacity: wordmark,
            clipPath: `inset(-20% ${(1 - wordmark) * 100}% -20% 0)`,
          }}
        >
          Cykla
        </Headline>
      </div>
    </AbsoluteFill>
  );
}
