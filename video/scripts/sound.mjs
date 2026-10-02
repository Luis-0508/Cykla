// Synthesises the trailer's sound effects into public/sfx/*.wav.
//
// Everything is procedural (additive sine partials, filtered noise and a small
// Freeverb-style reverb) with a seeded random generator, so every run writes
// byte-identical files and no third-party audio is involved.
//
//   node scripts/sound.mjs
//
// Palette: one key (D major pentatonic), two timbres that mirror the video's
// grammar. A "felt" tone (soft mallet, quick decay) stands for things that were
// recorded; a "breath" tone (filtered air with a slow, slightly detuned sine)
// stands for estimates. Levels are kept low; the mix sets the final volume.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { breath, felt, finish as normalise, onePoleLowpass, reverb, rng, SR, stereo, sweep, wav, env } from './dsp.mjs';

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(VIDEO_DIR, 'public', 'sfx');
/** Overall lift applied to every peak level below (the relative balance stays as written). */
const MASTER_DB = 4;
const finish = (out, peakDb) => normalise(out, peakDb + MASTER_DB);

// D major pentatonic.
const N = { D3: 146.83, A3: 220.0, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440.0, B4: 493.88, D5: 587.33, E5: 659.25, Fs5: 739.99 };

// --- The sounds ---------------------------------------------------------------
// Peak levels are set here; the mix (src/sound/cues.ts) only trims them.

const SOUNDS = {
  /** A soft fingertip on glass: a muted thump with a little felt. */
  tap() {
    const out = stereo(0.25);
    const rand = rng(3);
    for (let i = 0; i < out[0].length; i++) {
      const t = i / SR;
      const v = 0.8 * Math.sin(2 * Math.PI * 150 * t) * env(t, 0.003, 0.03) + 0.22 * (rand() * 2 - 1) * env(t, 0.001, 0.006);
      out[0][i] = out[1][i] = v;
    }
    for (const ch of out) {
      onePoleLowpass(ch, 1300);
      onePoleLowpass(ch, 1300);
    }
    reverb(out, { wet: 0.08, room: 0.5 });
    return finish(out, -16);
  },

  /** The filled dot: one felt tone. */
  recorded() {
    const out = stereo(2.2);
    felt(out, 0.01, N.D4, { decay: 0.55, pan: -0.15 });
    reverb(out, { wet: 0.28 });
    return finish(out, -14);
  },

  /** The dashed ring: air that draws itself, with a quiet tone inside it (0.9 s, like the ring). */
  estimated() {
    const out = stereo(2.6);
    breath(out, 0.0, N.A4, 1.5, { air: 0.55, seed: 11, peak: 0.45, pan: 0.15 });
    reverb(out, { wet: 0.42 });
    return finish(out, -17);
  },

  /** Dot and ring become the mark: the two timbres meet on a soft open fifth. */
  mark() {
    const out = stereo(3.2);
    felt(out, 0.02, N.D4, { decay: 0.7, gain: 0.9, pan: -0.1 });
    felt(out, 0.09, N.A4, { decay: 0.7, gain: 0.55, pan: 0.1, bright: 0.6 });
    breath(out, 0.0, N.D5, 1.6, { gain: 0.35, air: 0.4, seed: 21, peak: 0.25 });
    reverb(out, { wet: 0.36 });
    return finish(out, -14);
  },

  /** ESTIMATE becomes RECORDED: a rising fourth, settled rather than celebratory. */
  confirm() {
    const out = stereo(2.6);
    felt(out, 0.01, N.A4, { decay: 0.45, gain: 0.7, bright: 0.7 });
    felt(out, 0.12, N.D5, { decay: 0.7, gain: 0.85, bright: 0.7 });
    reverb(out, { wet: 0.3 });
    return finish(out, -15);
  },

  /** Calendar halos: recorded days (felt) and the prediction window (breath). */
  haloRecorded() {
    const out = stereo(1.6);
    felt(out, 0.01, N.Fs4, { decay: 0.4, bright: 0.6 });
    reverb(out, { wet: 0.28 });
    return finish(out, -19);
  },
  haloWindow() {
    const out = stereo(2.2);
    breath(out, 0.0, N.B4, 1.2, { air: 0.5, seed: 31, peak: 0.4 });
    reverb(out, { wet: 0.4 });
    return finish(out, -20);
  },

  /** Crescent into night: air from the top right drifting left, a low hum under it. */
  sweepIn() {
    const out = stereo(2.4);
    sweep(out, 0, 1.55, { from: 320, to: 1900, panFrom: 0.65, panTo: -0.35, seed: 41 });
    breath(out, 0.1, N.D3, 1.5, { gain: 0.35, air: 0, peak: 0.5 });
    reverb(out, { wet: 0.3 });
    return finish(out, -17);
  },
  /** Crescent back to day: from the bottom left, slightly brighter. */
  sweepOut() {
    const out = stereo(2.4);
    sweep(out, 0, 1.45, { from: 380, to: 2200, panFrom: -0.6, panTo: 0.35, seed: 43 });
    breath(out, 0.1, N.A3, 1.3, { gain: 0.3, air: 0, peak: 0.5 });
    reverb(out, { wet: 0.3 });
    return finish(out, -17);
  },

  /** Recorded starts land on the timeline: six muted felt notes, one per start. */
  history() {
    const out = stereo(2.8);
    const notes = [N.D4, N.E4, N.Fs4, N.A4, N.B4, N.D5];
    notes.forEach((f, i) => felt(out, 0.01 + i * (5 / 30), f, { decay: 0.32, gain: 0.55 + i * 0.05, bright: 0.4, pan: -0.5 + i * 0.12 }));
    reverb(out, { wet: 0.3 });
    return finish(out, -21);
  },

  /** The dashed projection and its range: air rising along the arc, landing on a breath tone. */
  projection() {
    const out = stereo(3.2);
    sweep(out, 0, 1.1, { from: 600, to: 1800, panFrom: -0.1, panTo: 0.4, seed: 51, gain: 0.6 });
    breath(out, 0.7, N.E5, 1.6, { air: 0.45, seed: 53, peak: 0.3, pan: 0.35 });
    reverb(out, { wet: 0.42 });
    return finish(out, -19);
  },

  /** End card: a warm, open chord that rings out. */
  closing() {
    const out = stereo(5.2);
    felt(out, 0.02, N.D3, { decay: 1.4, gain: 0.7, bright: 0.4 });
    felt(out, 0.05, N.A3, { decay: 1.3, gain: 0.55, bright: 0.4, pan: -0.15 });
    felt(out, 0.1, N.Fs4, { decay: 1.2, gain: 0.45, bright: 0.5, pan: 0.15 });
    felt(out, 0.16, N.D5, { decay: 1.1, gain: 0.3, bright: 0.5, pan: 0.05 });
    breath(out, 0.0, N.A4, 3.4, { gain: 0.22, air: 0.25, seed: 61, peak: 0.3 });
    reverb(out, { wet: 0.42, room: 0.84 });
    return finish(out, -14);
  },
};

await mkdir(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  await writeFile(path.join(OUT, `${name}.wav`), wav(make()));
}
console.log(`${Object.keys(SOUNDS).length} sounds in ${OUT}`);
