import { Html5Audio, Sequence, interpolate, staticFile } from 'remotion';
import { FPS, clamp } from '../theme';
import { TOTAL_FRAMES } from '../timeline';
import { CUES } from './cues';
import { LINES, VOICE_SECONDS } from './narration';

/** Effects sit this much lower while the narrator speaks (about −6 dB). */
const DUCK = 0.5;
const DUCK_IN = 8; // frames before a line starts
const DUCK_OUT = 12; // frames after it ends
/** Everything fades over the last frames so the closing tone never cuts off. */
const TAIL = 24;

export function duckAt(frame: number) {
  let amount = 0;
  for (const line of LINES) {
    const end = line.from + Math.ceil(VOICE_SECONDS[line.id] * FPS);
    amount = Math.max(amount, interpolate(frame, [line.from - DUCK_IN, line.from, end, end + DUCK_OUT], [0, 1, 1, 0], clamp));
  }
  return 1 - (1 - DUCK) * amount;
}

const tail = (frame: number) => interpolate(frame, [TOTAL_FRAMES - TAIL, TOTAL_FRAMES], [1, 0], clamp);

/**
 * Sound for both cuts. Without narration the effects play at their mixed
 * level; with narration the voice is added and the effects duck under it.
 */
export function SoundLayer({ narration }: { narration: boolean }) {
  return (
    <>
      {CUES.map((cue, i) => (
        <Sequence key={`${cue.sfx}-${i}`} from={cue.from} name={`sfx · ${cue.sfx}`} layout="none">
          <Html5Audio
            src={staticFile(`sfx/${cue.sfx}.wav`)}
            volume={(f) => cue.volume * tail(cue.from + f) * (narration ? duckAt(cue.from + f) : 1)}
          />
        </Sequence>
      ))}
      {narration &&
        LINES.map((line) => (
          <Sequence key={line.id} from={line.from} name={`voice · ${line.id}`} layout="none">
            <Html5Audio src={staticFile(`voice/${line.id}.wav`)} volume={(f) => tail(line.from + f)} />
          </Sequence>
        ))}
    </>
  );
}
