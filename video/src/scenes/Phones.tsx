import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Est, Eyebrow, Headline, Sub } from '../components/Brand';
import { Capture } from '../components/Capture';
import { CopyBlock } from '../components/Copy';
import { Phone } from '../components/Phone';
import { BRAND, LIGHT, keys, span } from '../theme';

/** 0:05 — First run: the real onboarding welcome, no account. */
export const FIRST_RUN_FRAMES = 108;

export function FirstRun() {
  const f = useCurrentFrame();
  const rise = span(f, 0, 34);
  return (
    <AbsoluteFill>
      <CopyBlock
        top={360}
        start={14}
        end={FIRST_RUN_FRAMES + 4}
        lines={[
          <Eyebrow key="e" color={BRAND.plum} style={{ marginBottom: 22 }}>
            First run
          </Eyebrow>,
          <Headline key="h" palette={LIGHT}>
            No account.
          </Headline>,
          <Sub key="s" palette={LIGHT} style={{ marginTop: 26, maxWidth: 560 }}>
            Your cycle data stays on this device. Nothing to sign up for.
          </Sub>,
        ]}
      />
      <Phone dy={(1 - rise) * 980} camera={{ s: 1.04 - 0.04 * span(f, 20, 100), fx: 195, fy: 420 }}>
        <Capture shot="onboarding" at={[[0, 0], [119, 119]]} />
      </Phone>
    </AbsoluteFill>
  );
}

/**
 * 0:08 — You record. Today says ESTIMATE because day 5 was never entered;
 * the user logs Light bleeding and the same card turns into RECORDED.
 */
export const RECORD_FRAMES = 300;

export function Record() {
  const f = useCurrentFrame();
  const [s, fx, fy] = keys(f, [
    [0, 1, 195, 422],
    [12, 1, 195, 422],
    [42, 1.42, 195, 205],
    [50, 1.42, 195, 205],
    [72, 1.18, 195, 300],
    [150, 1.16, 195, 360],
    [176, 1, 195, 422],
    [214, 1, 195, 422],
    [246, 1.46, 195, 205],
    [300, 1.52, 195, 205],
  ]);
  const screenIn = span(f, 0, 10);
  return (
    <AbsoluteFill>
      <CopyBlock
        top={370}
        start={8}
        end={206}
        lines={[
          <Headline key="h" palette={LIGHT}>
            You record.
          </Headline>,
          <Sub key="s" palette={LIGHT} style={{ marginTop: 26, maxWidth: 560 }}>
            Nothing becomes a record until you enter it. Until then, Cykla calls it an estimate.
          </Sub>,
        ]}
      />
      <CopyBlock
        top={390}
        start={222}
        end={RECORD_FRAMES + 30}
        lines={[
          <Eyebrow key="e" color={BRAND.plum} style={{ marginBottom: 22 }}>
            One entry later
          </Eyebrow>,
          <Headline key="h" palette={LIGHT}>
            From <Est color={BRAND.period} p={span(f, 236, 256)}>estimate</Est>
            <br />
            to record.
          </Headline>,
        ]}
      />
      <Phone camera={{ s, fx, fy }}>
        <div style={{ position: 'absolute', inset: 0, opacity: screenIn }}>
          <Capture shot="record" at={[[0, 0], [300, 330]]} />
        </div>
      </Phone>
    </AbsoluteFill>
  );
}
