import { at, type SceneId } from '../timeline';
import script from './script.json';
import durations from './voice.json';

/**
 * Narration for the narrated cut. The words and their cue points live in
 * script.json (shared with scripts/voice.py, which writes one file per line to
 * public/voice/<id>.wav and the measured lengths to voice.json).
 *
 * Lines sit between the key visual moments, never on them: the mark resolving,
 * the flip to RECORDED, the crescent wipes and the end card's mark all play
 * without a voice over them.
 */
export type Line = { id: string; from: number; text: string };

export const LINES: Line[] = (script as { id: string; scene: SceneId; frame: number; text: string }[]).map(
  ({ id, scene, frame, text }) => ({ id, from: at(scene, frame), text }),
);

/** Length of each line in seconds. */
export const VOICE_SECONDS = durations as Record<string, number>;
