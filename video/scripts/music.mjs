// Composes the trailer's music bed into public/music/bed.wav: one continuous,
// procedural piece timed to the picture, shared by both cuts.
//
//   node scripts/music.mjs
//
// Instrumentation: a soft pad (detuned sine voices with gentle overtones and a
// slow drift, through a moving low-pass), a near-silent muted pulse, a few
// felt-piano notes and a faint room tone. D major, like the effects, so every
// effect lands inside the harmony. No melody: chord tones only, far apart.
//
// Arc (anchor frames come from src/sound/music.json; Remotion checks that they
// still match the timeline):
//   opening      D(add9), very soft, filter closed, no pulse
//   first run    Dmaj9 opens up, the pulse fades in
//   you record   Bm7 → Gmaj7 → Asus4, held as tension until…
//   RECORDED     …it resolves to D on the frame the card flips (with `confirm`)
//   estimates    Bm7 → Gmaj7, pulse steady
//   night        Em9 → Bm7 → Gmaj7, voiced lower, filter darker, pulse halves
//   yours        Em7 → Asus, restrained
//   day          G(add9) voiced high, filter opens, pulse leaves
//   end card     resolves to D with the closing chord and rings out
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { felt, lowpass, onePoleLowpass, reverb, rng, SR, stereo, wav } from './dsp.mjs';

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(VIDEO_DIR, 'public', 'music');
const { fps, anchors } = JSON.parse(await readFile(path.join(VIDEO_DIR, 'src', 'sound', 'music.json'), 'utf8'));
const T = Object.fromEntries(Object.entries(anchors).map(([k, f]) => [k, f / fps]));

/** Overall level of the file; Remotion sets the level per cut (volume ≤ 1). */
const TARGET_RMS_DB = -24;

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function hz(name) {
  const [, pc, oct] = name.match(/^([A-G]#?)(-?\d)$/);
  return 440 * 2 ** ((NOTE[pc] + (Number(oct) + 1) * 12 - 69) / 12);
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Piecewise interpolation over [time, value] keys; `log` for frequencies. */
function curve(keys, log = false) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      const [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const x = smooth((t - t0) / Math.max(1e-6, t1 - t0));
        return log ? v0 * (v1 / v0) ** x : v0 + (v1 - v0) * x;
      }
    }
    return keys[keys.length - 1][1];
  };
}

// --- Score ------------------------------------------------------------------
// Each chord fades in over `xf` seconds from `t`, and out while the next one fades in.

const CHORDS = [
  { t: 0, xf: 2.5, notes: ['D3', 'A3', 'E4'] },
  { t: T.firstRun, xf: 2.2, notes: ['D3', 'A3', 'E4', 'F#4'] },
  { t: T.record + 0.4, xf: 2.2, notes: ['B2', 'F#3', 'A3', 'D4'] },
  { t: T.record + 3.4, xf: 2.2, notes: ['G2', 'D3', 'F#3', 'B3'] },
  { t: T.recorded - 1.9, xf: 1.4, notes: ['A2', 'E3', 'D4', 'E4'] },
  { t: T.recorded, xf: 0.45, notes: ['D3', 'A3', 'D4', 'F#4'] },
  { t: T.estimates + 0.3, xf: 2.4, notes: ['B2', 'F#3', 'A3', 'D4'] },
  { t: T.estimates + 3.3, xf: 2.4, notes: ['G2', 'D3', 'F#3', 'B3'] },
  { t: T.night, xf: 1.4, notes: ['E2', 'B2', 'G3', 'D4', 'F#4'] },
  { t: T.night + 3.0, xf: 2.6, notes: ['B2', 'F#3', 'A3', 'D4'] },
  { t: T.night + 5.6, xf: 2.6, notes: ['G2', 'D3', 'B3', 'F#4'] },
  { t: T.yours, xf: 2.4, notes: ['E2', 'B2', 'G3', 'D4'] },
  { t: T.yours + 2.0, xf: 1.8, notes: ['A2', 'E3', 'B3', 'D4'] },
  { t: T.day, xf: 1.1, notes: ['G3', 'D4', 'A4', 'B4'] },
  { t: T.resolve, xf: 0.6, notes: ['D3', 'A3', 'F#4', 'A4'] },
];

/** Pad brightness: closed at the start, open by day, dark at night, open again at the end. */
const CUTOFF = curve(
  [
    [0, 800],
    [T.firstRun, 1000],
    [T.firstRun + 2.5, 2100],
    [T.night - 0.1, 2100],
    [T.night + 1.3, 560],
    [T.day, 620],
    [T.day + 1.2, 2600],
    [T.end, 2000],
  ],
  true,
);

/** Pad overtones (0–1): what makes day feel open and night feel deep, more than the filter. */
const BRIGHT = curve([
  [0, 0.45],
  [T.firstRun, 0.5],
  [T.firstRun + 2.5, 1],
  [T.night - 0.1, 1],
  [T.night + 1.3, 0.25],
  [T.day, 0.3],
  [T.day + 1.2, 1],
  [T.end, 0.9],
]);

/** Pad level: rises out of silence, a little fuller from the first run, dies away after the end chord. */
const PAD = curve([
  [0, 0],
  [2.4, 0.55],
  [T.firstRun, 0.6],
  [T.firstRun + 2.5, 0.85],
  // Each crescent wipe: the pad draws back for its sweep, then returns darker / brighter.
  [T.night - 0.2, 0.85],
  [T.night + 0.5, 0.55],
  [T.night + 1.7, 0.78],
  [T.day - 0.2, 0.78],
  [T.day + 0.45, 0.55],
  [T.resolve, 0.85],
  [T.resolve + 1.2, 0.85],
  [T.end, 0],
]);

/** Pulse level: absent in the opening, felt by day, half-time and quieter at night, gone by the end card. */
const PULSE = curve([
  [T.firstRun, 0],
  [T.firstRun + 3, 1],
  [T.night, 1],
  [T.night + 1.2, 0.7],
  [T.yours, 0.7],
  [T.yours + 1.5, 0.55],
  [T.day, 0.5],
  [T.resolve, 0],
]);

/** Sparse felt-piano notes: chord tones, placed between the sound effects. */
const PIANO = [
  [4.8, 'F#4', 0.8],
  [7.1, 'E5', 0.55],
  [9.7, 'D5', 0.6],
  [11.6, 'B4', 0.65],
  [13.4, 'E4', 0.75],
  [16.2, 'F#5', 0.45],
  [17.5, 'D5', 0.55],
  [20.9, 'B4', 0.6],
  [23.6, 'B3', 0.7],
  [27.0, 'F#4', 0.6],
  [29.6, 'D4', 0.65],
  [31.4, 'G4', 0.6],
  [33.0, 'E4', 0.55],
  [36.3, 'A4', 0.45],
];

const BEAT = 60 / 72;

// --- Layers -------------------------------------------------------------------

const LENGTH = T.end + 0.05;

function pad() {
  const out = stereo(LENGTH);
  const voices = [
    [-0.0016, -0.55, 0.0],
    [0, 0, 1.7],
    [0.0013, 0.55, 3.1],
  ];
  // [ratio, amplitude, how much of it follows BRIGHT]
  const partials = [
    [1, 1, 0],
    [2, 0.32, 0.7],
    [3, 0.12, 1],
    [4, 0.05, 1],
  ];
  CHORDS.forEach((chord, i) => {
    const next = CHORDS[i + 1];
    const s0 = Math.max(0, Math.floor(chord.t * SR));
    const s1 = Math.min(out[0].length, Math.ceil((next ? next.t + next.xf : LENGTH) * SR));
    for (const name of chord.notes) {
      const f = hz(name);
      const weight = 0.22 * (f / 220) ** 0.35; // favour the mids: low voices only support
      for (const [detune, pan, phase] of voices) {
        const fv = f * (1 + detune);
        const gl = Math.cos(((pan + 1) * Math.PI) / 4);
        const gr = Math.sin(((pan + 1) * Math.PI) / 4);
        for (let s = s0; s < s1; s++) {
          const t = s / SR;
          const gate = smooth((t - chord.t) / chord.xf) * (next ? 1 - smooth((t - next.t) / next.xf) : 1);
          if (gate <= 0) continue;
          // Slow drift (±0.07 %), integrated analytically so the phase never jumps.
          const drift = -((fv * 0.0007) / 0.11) * Math.cos(2 * Math.PI * 0.11 * t + phase);
          const bright = BRIGHT(t);
          let v = 0;
          for (const [k, a, follow] of partials) v += a * (1 - follow + follow * bright) * Math.sin(2 * Math.PI * (fv * k * t + drift * k) + phase * k);
          // A breathing swell, out of step between voices.
          const breathe = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.07 * t + phase);
          v *= weight * gate * breathe;
          out[0][s] += v * gl;
          out[1][s] += v * gr;
        }
      }
    }
  });
  for (const ch of out) {
    lowpass(ch, CUTOFF, 0.6);
    for (let s = 0; s < ch.length; s++) ch[s] *= PAD(s / SR);
  }
  return out;
}

/** Root of the chord sounding at time t, placed between A1 and A2 an octave below the pad. */
function rootAt(t) {
  let chord = CHORDS[0];
  for (const c of CHORDS) if (c.t <= t + 0.05) chord = c;
  let f = hz(chord.notes[0]);
  while (f > 110) f /= 2;
  while (f < 55) f *= 2;
  return f;
}

function pulse() {
  const out = stereo(LENGTH);
  // Beats are phased so one lands exactly on the flip to RECORDED.
  const phase = T.recorded % BEAT;
  for (let k = 0; phase + (k * BEAT) / 2 < T.resolve; k++) {
    const t = phase + (k * BEAT) / 2;
    const level = PULSE(t);
    if (level <= 0.001) continue;
    const onBeat = k % 2 === 0;
    const night = t >= T.night + 0.6 && t < T.day;
    if (night && !onBeat) continue; // half-time at night
    const root = rootAt(t);
    const f = onBeat ? root * 2 : root * 3; // octave on the beat, fifth between
    felt(out, t, f, { gain: level * (onBeat ? 0.19 : 0.1), decay: 0.16, bright: 0.25, pan: onBeat ? -0.12 : 0.12 });
  }
  for (const ch of out) {
    onePoleLowpass(ch, 900);
    onePoleLowpass(ch, 900);
  }
  return out;
}

function piano() {
  const out = stereo(LENGTH);
  PIANO.forEach(([t, name, gain], i) =>
    felt(out, t, hz(name), { gain: gain * 0.2, decay: 0.75, bright: 0.45, pan: i % 2 ? 0.25 : -0.25 }),
  );
  for (const ch of out) onePoleLowpass(ch, 2600);
  return out;
}

/** A barely-there room tone so the silence between notes is warm rather than digital. */
function room() {
  const out = stereo(LENGTH);
  for (const [c, seed] of [
    [0, 71],
    [1, 73],
  ]) {
    const rand = rng(seed);
    for (let s = 0; s < out[c].length; s++) out[c][s] = (rand() * 2 - 1) * 0.004 * PAD(s / SR);
    onePoleLowpass(out[c], 500);
    onePoleLowpass(out[c], 500);
  }
  return out;
}

// --- Mix ----------------------------------------------------------------------

const layers = [pad(), pulse(), piano(), room()];
const mix = stereo(LENGTH);
for (const layer of layers) for (let c = 0; c < 2; c++) for (let s = 0; s < mix[c].length; s++) mix[c][s] += layer[c][s];
reverb(mix, { wet: 0.34, room: 0.86, damp: 0.5 });

// Level by RMS over the sounding part; fade the first and last samples.
let sum = 0;
let n = 0;
for (let s = Math.floor(2.5 * SR); s < Math.floor(T.resolve * SR); s++) {
  sum += mix[0][s] ** 2 + mix[1][s] ** 2;
  n += 2;
}
const gain = 10 ** (TARGET_RMS_DB / 20) / Math.sqrt(sum / n);
const fade = Math.round(0.08 * SR);
for (let c = 0; c < 2; c++) {
  const ch = mix[c];
  for (let s = 0; s < ch.length; s++) ch[s] *= gain * Math.min(1, s / 480, (ch.length - 1 - s) / fade);
}

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'bed.wav'), wav(mix));
console.log(`music bed: ${LENGTH.toFixed(2)} s → ${path.join(OUT, 'bed.wav')}`);
