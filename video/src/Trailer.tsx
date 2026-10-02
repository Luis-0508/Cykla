import { AbsoluteFill, Sequence } from 'remotion';
import { Ground } from './components/Brand';
import { SoundLayer } from './sound/SoundLayer';
import { TIMELINE } from './timeline';

export type TrailerProps = { narration: boolean };

/** One picture for both cuts; only the sound layer differs. Scene order lives in timeline.ts. */
export function Trailer({ narration }: TrailerProps) {
  return (
    <AbsoluteFill>
      <Ground />
      {TIMELINE.map(({ name, from, frames, Component }) => (
        <Sequence key={name} name={name} from={from} durationInFrames={frames}>
          <Component />
        </Sequence>
      ))}
      <SoundLayer narration={narration} />
    </AbsoluteFill>
  );
}
