// Extracts frames from a rendered video for visual review, using the ffmpeg
// bundled with Remotion. Default timestamps cover every scene and transition.
//
//   node scripts/frames.mjs                       out/preview.mp4 → out/frames/
//   node scripts/frames.mjs out/cykla-trailer.mp4 3.5 12 20.2
import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const input = path.resolve(VIDEO_DIR, args[0]?.endsWith('.mp4') ? args.shift() : 'out/preview.mp4');
const times = args.length
  ? args.map(Number)
  : [1, 2.2, 3.4, 4.6, 6.5, 8.2, 9.5, 11, 13, 15, 17, 18.5, 20, 22, 24.5, 25.5, 26.5, 28, 30, 32, 34, 36.5, 38, 39.5, 41, 43];
const out = path.join(VIDEO_DIR, 'out', 'frames');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const t of times) {
  const file = path.join(out, `${t.toFixed(1).padStart(4, '0')}.jpg`);
  const result = spawnSync(
    'npx',
    ['remotion', 'ffmpeg', '-loglevel', 'error', '-ss', String(t), '-i', input, '-frames:v', '1', '-q:v', '3', '-y', file],
    { cwd: VIDEO_DIR, stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) process.exitCode = 1;
}
console.log(`${times.length} frames in ${out}`);
