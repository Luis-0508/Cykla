import { Html5Audio, Sequence, interpolate, staticFile } from 'remotion';
import { END_RESOLVE } from '../scenes/Closing';
import { RECORD_CUES } from '../scenes/Phones';
import { FPS, clamp } from '../theme';
import { TOTAL_FRAMES, at } from '../timeline';
import { CUES } from './cues';
import music from './music.json';
import { LINES, VOICE_SECONDS } from './narration';

/** Effects sit this much lower while the narrator speaks (about −6 dB). */
const SFX_DUCK = 0.5;

/**
 * Music bed (public/music/bed.wav, scripts/music.mjs). Same file in both cuts.
 * Without narration it sits a little forward; with narration it starts lower,
 * dips about 5 dB more under each line and breathes back up between lines.
 */
const MUSIC = { solo: 0.42, narrated: 0.3, duck: 0.55 };

/** The sound design cut has no voice to anchor its loudness, so music and effects play a little louder overall. */
const SOLO_MASTER = 1.5;

/** Everything fades over the last frames so the closing tone never cuts off. */
const TAIL = 24;

/** 0 → 1 while a narration line is playing, with ramps either side. */
function speaking(frame: number, rampIn: number, rampOut: number) {
  let amount = 0;
  for (const line of LINES) {
    const end = line.from + Math.ceil(VOICE_SECONDS[line.id] * FPS);
    amount = Math.max(amount, interpolate(frame, [line.from - rampIn, line.from, end, end + rampOut], [0, 1, 1, 0], clamp));
  }
  return amount;
}

const sfxDuck = (frame: number) => 1 - (1 - SFX_DUCK) * speaking(frame, 8, 12);
// The music dips a little ahead of each line and recovers slowly, so the swells sit between phrases.
const musicDuck = (frame: number) => 1 - (1 - MUSIC.duck) * speaking(frame, 12, 24);

const tail = (frame: number) => interpolate(frame, [TOTAL_FRAMES - TAIL, TOTAL_FRAMES], [1, 0], clamp);

// The score is composed against these frames; fail loudly if the edit moved and the bed was not regenerated.
const EXPECTED_ANCHORS = {
  firstRun: at('firstRun', 0),
  record: at('record', 0),
  recorded: at('record', RECORD_CUES.recorded),
  estimates: at('estimates', 0),
  night: at('explain', 0),
  yours: at('yours', 0),
  day: at('end', 0),
  resolve: at('end', END_RESOLVE - 4),
  end: TOTAL_FRAMES,
};
for (const [key, frame] of Object.entries(EXPECTED_ANCHORS)) {
  if (music.anchors[key as keyof typeof music.anchors] !== frame) {
    throw new Error(
      `src/sound/music.json anchor "${key}" is ${music.anchors[key as keyof typeof music.anchors]}, the timeline says ${frame}. Update it and run \`npm run music\`.`,
    );
  }
}

/**
 * Sound for both cuts: the music bed, the effects and, in the narrated cut,
 * the voice, with the bed and effects ducking under it.
 */
export function SoundLayer({ narration }: { narration: boolean }) {
  return (
    <>
      <Html5Audio
        src={staticFile('music/bed.wav')}
        volume={(f) => tail(f) * (narration ? MUSIC.narrated * musicDuck(f) : MUSIC.solo * SOLO_MASTER)}
      />
      {CUES.map((cue, i) => (
        <Sequence key={`${cue.sfx}-${i}`} from={cue.from} name={`sfx · ${cue.sfx}`} layout="none">
          <Html5Audio
            src={staticFile(`sfx/${cue.sfx}.wav`)}
            volume={(f) => cue.volume * tail(cue.from + f) * (narration ? sfxDuck(cue.from + f) : SOLO_MASTER)}
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
