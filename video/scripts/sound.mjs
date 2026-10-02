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

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(VIDEO_DIR, 'public', 'sfx');
const SR = 48000;
/** Overall lift applied to every peak level below (the relative balance stays as written). */
const MASTER_DB = 4;

// D major pentatonic.
const N = { D3: 146.83, A3: 220.0, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440.0, B4: 493.88, D5: 587.33, E5: 659.25, Fs5: 739.99 };

// --- Utilities ----------------------------------------------------------------

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));
const stereo = (seconds) => [buffer(seconds), buffer(seconds)];

/** Raised-cosine attack, exponential decay. */
function env(t, attack, decay) {
  if (t < 0) return 0;
  const a = t < attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack) : 1;
  return a * Math.exp(-Math.max(0, t - attack) / decay);
}

/** Smooth bell envelope over [0, length] peaking at `peak` (0..1 of length). */
function bell(t, length, peak = 0.5) {
  if (t < 0 || t > length) return 0;
  const x = t / length;
  const y = x < peak ? x / peak : (1 - x) / (1 - peak);
  return Math.sin((Math.PI / 2) * y) ** 2;
}

function onePoleLowpass(data, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < data.length; i++) data[i] = y = (1 - a) * data[i] + a * y;
}

/** State-variable band-pass with a cutoff that may change per sample. */
function bandpass(input, cutoffAt, q = 1.2) {
  const out = new Float32Array(input.length);
  let low = 0;
  let band = 0;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoffAt(i / SR), SR / 6)) / SR);
    const high = input[i] - low - band / q;
    band += f * high;
    low += f * band;
    out[i] = band;
  }
  return out;
}

/** Felt-mallet tone: a few inharmonic partials, higher ones dying first. */
function felt([l, r], start, freq, { gain = 1, decay = 0.45, pan = 0, bright = 1 } = {}) {
  const partials = [
    [1, 1, 1],
    [2.0, 0.16 * bright, 0.45],
    [3.01, 0.05 * bright, 0.3],
    [4.18, 0.018 * bright, 0.2],
  ];
  const s0 = Math.round(start * SR);
  const len = Math.min(l.length - s0, Math.ceil(decay * 7 * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    for (const [ratio, amp, d] of partials) v += amp * Math.sin(2 * Math.PI * freq * ratio * t) * env(t, 0.006, decay * d);
    l[s0 + i] += v * gl;
    r[s0 + i] += v * gr;
  }
}

/** Breath tone: a slow, softly beating sine pair with a band of air around it. */
function breath([l, r], start, freq, length, { gain = 1, air = 0.5, seed = 1, peak = 0.35, pan = 0 } = {}) {
  const rand = rng(seed);
  const s0 = Math.round(start * SR);
  const n = Math.min(l.length - s0, Math.ceil(length * SR));
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rand() * 2 - 1;
  const band = bandpass(noise, () => freq * 2.5, 2.2);
  // Warm the air: two gentle low-pass stages keep it from reading as hiss.
  onePoleLowpass(band, freq * 4);
  onePoleLowpass(band, freq * 4);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = bell(t, length, peak);
    const tone = 0.5 * Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * (freq + 1.3) * t);
    const v = e * (tone * 0.8 + band[i] * air * 0.9);
    l[s0 + i] += v * gl;
    r[s0 + i] += v * gr;
  }
}

/** Air moving across the frame: filtered noise whose centre sweeps up and back. */
function sweep([l, r], start, length, { gain = 1, from = 420, to = 2600, panFrom = 0.6, panTo = -0.4, seed = 7 } = {}) {
  const rand = rng(seed);
  const s0 = Math.round(start * SR);
  const n = Math.min(l.length - s0, Math.ceil(length * SR));
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rand() * 2 - 1;
  const cutoff = (t) => from * (to / from) ** Math.sin((Math.PI / 2) * Math.min(1, t / (length * 0.7)));
  const air = bandpass(noise, cutoff, 0.9);
  onePoleLowpass(air, to * 0.85);
  onePoleLowpass(air, to * 0.85);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = bell(t, length, 0.42) * gain;
    const pan = panFrom + (panTo - panFrom) * (t / length);
    l[s0 + i] += air[i] * e * Math.cos(((pan + 1) * Math.PI) / 4);
    r[s0 + i] += air[i] * e * Math.sin(((pan + 1) * Math.PI) / 4);
  }
}

/** Small stereo Freeverb (8 combs + 4 allpasses per side). */
function reverb([l, r], { wet = 0.25, room = 0.8, damp = 0.45 } = {}) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const passes = [556, 441, 341, 225];
  const run = (input, spread) => {
    const out = new Float32Array(input.length);
    for (const len of combs) {
      const size = Math.round((len + spread) * scale);
      const buf = new Float32Array(size);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < input.length; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = input[i] * 0.015 + store * room;
        out[i] += y;
        idx = (idx + 1) % size;
      }
    }
    for (const len of passes) {
      const size = Math.round((len + spread) * scale);
      const buf = new Float32Array(size);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const b = buf[idx];
        const x = out[i];
        buf[idx] = x + b * 0.5;
        out[i] = b - x;
        idx = (idx + 1) % size;
      }
    }
    return out;
  };
  const wl = run(l, 0);
  const wr = run(r, 23);
  for (let i = 0; i < l.length; i++) {
    l[i] = l[i] * (1 - wet * 0.5) + wl[i] * wet;
    r[i] = r[i] * (1 - wet * 0.5) + wr[i] * wet;
  }
}

/** Normalises to a peak in dBFS and fades the last 60 ms so nothing clicks. */
function finish([l, r], peakDb) {
  let peak = 0;
  for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  const g = peak > 0 ? 10 ** ((peakDb + MASTER_DB) / 20) / peak : 0;
  const fade = Math.round(0.06 * SR);
  for (let i = 0; i < l.length; i++) {
    const tail = Math.min(1, (l.length - 1 - i) / fade);
    const head = Math.min(1, i / 48);
    l[i] *= g * tail * head;
    r[i] *= g * tail * head;
  }
  return [l, r];
}

function wav([l, r]) {
  const n = l.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), 46 + i * 4);
  }
  return data;
}

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
