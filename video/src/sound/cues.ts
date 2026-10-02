import { END_RESOLVE } from '../scenes/Closing';
import { ESTIMATE_CUES } from '../scenes/Estimates';
import { EXPLAIN_CUES } from '../scenes/Explain';
import { GRAMMAR_CUES } from '../scenes/Grammar';
import { FIRST_RUN_TAP, RECORD_CUES } from '../scenes/Phones';
import { at } from '../timeline';

/**
 * The sound layer: where each effect from public/sfx (scripts/sound.mjs)
 * starts, in absolute frames, and how loud it plays (0–1, never amplified).
 *
 * Deliberately sparse. Only moments that change meaning get a sound: the two
 * marks and their union, the taps that move the story, the flip to RECORDED,
 * the crescent wipes, the timeline and the end card. "Yours" stays silent.
 */
export type Sfx =
  | 'tap'
  | 'recorded'
  | 'estimated'
  | 'mark'
  | 'confirm'
  | 'haloRecorded'
  | 'haloWindow'
  | 'sweepIn'
  | 'sweepOut'
  | 'history'
  | 'projection'
  | 'closing';

export type Cue = { sfx: Sfx; from: number; volume: number };

export const CUES: Cue[] = [
  // Opening: the filled dot, the dashed ring, then both become the mark.
  { sfx: 'recorded', from: at('grammar', GRAMMAR_CUES.dot), volume: 0.9 },
  { sfx: 'estimated', from: at('grammar', GRAMMAR_CUES.ring), volume: 0.9 },
  { sfx: 'mark', from: at('grammar', GRAMMAR_CUES.mark), volume: 0.8 },
  // First run: "Continue without an account".
  { sfx: 'tap', from: at('firstRun', FIRST_RUN_TAP), volume: 0.75 },
  // You record: open the editor, save, and the card turns into RECORDED.
  { sfx: 'tap', from: at('record', RECORD_CUES.logDay), volume: 0.75 },
  { sfx: 'tap', from: at('record', RECORD_CUES.save), volume: 0.8 },
  { sfx: 'confirm', from: at('record', RECORD_CUES.recorded), volume: 0.85 },
  // Calendar: recorded days (felt), then the prediction window (air).
  { sfx: 'haloRecorded', from: at('estimates', ESTIMATE_CUES.period), volume: 0.8 },
  { sfx: 'haloWindow', from: at('estimates', ESTIMATE_CUES.window), volume: 0.8 },
  // Night: the crescent, the recorded starts, the projection and its range.
  { sfx: 'sweepIn', from: at('explain', 0), volume: 0.9 },
  { sfx: 'history', from: at('explain', EXPLAIN_CUES.history), volume: 0.85 },
  { sfx: 'projection', from: at('explain', EXPLAIN_CUES.projection), volume: 0.85 },
  // Back to day, and the end card resolves.
  { sfx: 'sweepOut', from: at('end', 0), volume: 0.85 },
  { sfx: 'closing', from: at('end', END_RESOLVE - 4), volume: 0.85 },
];
