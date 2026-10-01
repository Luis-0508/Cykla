import { AbsoluteFill, Sequence } from 'remotion';
import { Ground } from './components/Brand';
import { END_FRAMES, END_WIPE, EndCard, YOURS_FRAMES, Yours } from './scenes/Closing';
import { ESTIMATES_FRAMES, Estimates } from './scenes/Estimates';
import { EXPLAIN_FRAMES, Explain, WIPE_FRAMES } from './scenes/Explain';
import { GRAMMAR_FRAMES, Grammar } from './scenes/Grammar';
import { FIRST_RUN_FRAMES, FirstRun, RECORD_FRAMES, Record } from './scenes/Phones';

/**
 * Scene order and overlaps. Phone scenes overlap by a few frames so the
 * screen content cross-fades inside a steady device; the night scenes start
 * while the previous scene is still on screen and reveal themselves through
 * the crescent wipe.
 */
const PHONE_OVERLAP = 10;

type Entry = { name: string; frames: number; overlap: number; Component: () => React.ReactNode };

const SCENES: Entry[] = [
  { name: 'Grammar', frames: GRAMMAR_FRAMES, overlap: 0, Component: Grammar },
  { name: 'First run', frames: FIRST_RUN_FRAMES, overlap: 12, Component: FirstRun },
  { name: 'You record', frames: RECORD_FRAMES, overlap: PHONE_OVERLAP, Component: Record },
  { name: 'Cykla estimates', frames: ESTIMATES_FRAMES, overlap: PHONE_OVERLAP, Component: Estimates },
  { name: 'Night · explains itself', frames: EXPLAIN_FRAMES, overlap: WIPE_FRAMES, Component: Explain },
  { name: 'Yours', frames: YOURS_FRAMES, overlap: PHONE_OVERLAP, Component: Yours },
  { name: 'End card', frames: END_FRAMES, overlap: END_WIPE, Component: EndCard },
];

export const TIMELINE = SCENES.reduce<(Entry & { from: number })[]>((list, scene) => {
  const prev = list[list.length - 1];
  const from = prev ? prev.from + prev.frames - scene.overlap : 0;
  return [...list, { ...scene, from }];
}, []);

export const TOTAL_FRAMES = TIMELINE[TIMELINE.length - 1].from + TIMELINE[TIMELINE.length - 1].frames;

export function Trailer() {
  return (
    <AbsoluteFill>
      <Ground />
      {TIMELINE.map(({ name, from, frames, Component }) => (
        <Sequence key={name} name={name} from={from} durationInFrames={frames}>
          <Component />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
