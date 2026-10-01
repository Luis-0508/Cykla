import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Eyebrow, Ground, Headline, Mark, Sub } from '../components/Brand';
import { Capture } from '../components/Capture';
import { CopyBlock } from '../components/Copy';
import { CrescentWipe } from '../components/CrescentWipe';
import { Phone } from '../components/Phone';
import { BRAND, DARK, F, LIGHT, keys, span } from '../theme';

/** 0:32 — Yours: export and delete controls, all local. */
export const YOURS_FRAMES = 150;

export function Yours() {
  const f = useCurrentFrame();
  const [s, fx, fy] = keys(f, [
    [0, 1, 195, 422],
    [30, 1, 195, 422],
    [100, 1.16, 195, 360],
    [150, 1.18, 195, 360],
  ]);
  return (
    <Ground dark>
      <CopyBlock
        top={340}
        start={8}
        end={YOURS_FRAMES + 30}
        lines={[
          <Eyebrow key="e" color={DARK.accent} style={{ marginBottom: 22 }}>
            On this device
          </Eyebrow>,
          <Headline key="h1" palette={DARK}>
            Yours to export.
          </Headline>,
          <Headline key="h2" palette={DARK}>
            Yours to delete.
          </Headline>,
          <Sub key="s" palette={DARK} style={{ marginTop: 26, maxWidth: 600 }}>
            No account, no ads, no analytics SDK. Health data is not transmitted.
          </Sub>,
        ]}
      />
      <Phone dark camera={{ s, fx, fy }}>
        <div style={{ position: 'absolute', inset: 0, opacity: span(f, 0, 10) }}>
          <Capture shot="privacy" at={[[0, 0], [YOURS_FRAMES, 149]]} />
        </div>
      </Phone>
    </Ground>
  );
}

/** 0:37 — The crescent returns the frame to day: one full cycle. End card. */
export const END_FRAMES = 170;
export const END_WIPE = 36;

export function EndCard() {
  const f = useCurrentFrame();
  const wipe = span(f, 0, END_WIPE);
  const mark = span(f, 12, 38);
  const word = span(f, 22, 46);
  const tag = span(f, 44, 64);
  const meta = span(f, 60, 80);
  const fine = span(f, 76, 96);
  return (
    <CrescentWipe p={wipe} cx={260} cy={930}>
      <Ground>
        <AbsoluteFill style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 34, marginTop: 300 }}>
            <Mark
              size={140}
              style={{ opacity: mark, transform: `scale(${0.85 + 0.15 * mark}) rotate(${(1 - mark) * -40}deg)` }}
            />
            <Headline
              palette={LIGHT}
              size={168}
              style={{
                color: BRAND.plum,
                letterSpacing: -3,
                opacity: word,
                clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
              }}
            >
              Cykla
            </Headline>
          </div>
          <Headline
            palette={LIGHT}
            size={58}
            style={{ marginTop: 36, opacity: tag, transform: `translateY(${(1 - tag) * 14}px)` }}
          >
            A calm place for your cycle.
          </Headline>
          <div
            style={{
              marginTop: 34,
              display: 'flex',
              gap: 18,
              alignItems: 'center',
              fontFamily: F.sans,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 0.4,
              color: LIGHT.muted,
              opacity: meta,
            }}
          >
            <span>Offline-first</span>
            <Sep />
            <span>No account</span>
            <Sep />
            <span>Open source · AGPL-3.0</span>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 64,
              fontFamily: F.sans,
              fontSize: 18,
              color: LIGHT.muted,
              opacity: fine * 0.9,
            }}
          >
            Cykla records data and calculates estimates. Not a diagnosis. Not a method of contraception.
          </div>
        </AbsoluteFill>
      </Ground>
    </CrescentWipe>
  );
}

function Sep() {
  return <span style={{ width: 6, height: 6, borderRadius: 6, background: BRAND.period, opacity: 0.8 }} />;
}
