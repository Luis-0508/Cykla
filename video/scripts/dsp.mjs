// Shared synthesis for the trailer's sound effects (scripts/sound.mjs) and
// music bed (scripts/music.mjs): seeded noise, envelopes, filters, a felt
// mallet tone, a breath tone, an air sweep, a small Freeverb and a WAV writer.
// Plain Node, no dependencies; identical output on every run.

export const SR = 48000;

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));
export const stereo = (seconds) => [buffer(seconds), buffer(seconds)];

/** Raised-cosine attack, exponential decay. */
export function env(t, attack, decay) {
  if (t < 0) return 0;
  const a = t < attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack) : 1;
  return a * Math.exp(-Math.max(0, t - attack) / decay);
}

/** Smooth bell envelope over [0, length] peaking at `peak` (0..1 of length). */
export function bell(t, length, peak = 0.5) {
  if (t < 0 || t > length) return 0;
  const x = t / length;
  const y = x < peak ? x / peak : (1 - x) / (1 - peak);
  return Math.sin((Math.PI / 2) * y) ** 2;
}

export function onePoleLowpass(data, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < data.length; i++) data[i] = y = (1 - a) * data[i] + a * y;
}

/** State-variable band-pass with a cutoff that may change per sample. */
export function bandpass(input, cutoffAt, q = 1.2) {
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

/** State-variable low-pass, in place, with a cutoff that may change per sample. */
export function lowpass(data, cutoffAt, q = 0.7) {
  let low = 0;
  let band = 0;
  for (let i = 0; i < data.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoffAt(i / SR), SR / 6)) / SR);
    const high = data[i] - low - band / q;
    band += f * high;
    low += f * band;
    data[i] = low;
  }
}

/** Felt-mallet tone: a few inharmonic partials, higher ones dying first. */
export function felt([l, r], start, freq, { gain = 1, decay = 0.45, pan = 0, bright = 1 } = {}) {
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
export function breath([l, r], start, freq, length, { gain = 1, air = 0.5, seed = 1, peak = 0.35, pan = 0 } = {}) {
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
export function sweep([l, r], start, length, { gain = 1, from = 420, to = 2600, panFrom = 0.6, panTo = -0.4, seed = 7 } = {}) {
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
export function reverb([l, r], { wet = 0.25, room = 0.8, damp = 0.45 } = {}) {
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
export function finish([l, r], peakDb) {
  let peak = 0;
  for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  const g = peak > 0 ? 10 ** (peakDb / 20) / peak : 0;
  const fade = Math.round(0.06 * SR);
  for (let i = 0; i < l.length; i++) {
    const tail = Math.min(1, (l.length - 1 - i) / fade);
    const head = Math.min(1, i / 48);
    l[i] *= g * tail * head;
    r[i] *= g * tail * head;
  }
  return [l, r];
}

export function wav([l, r]) {
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
