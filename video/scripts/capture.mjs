// Captures deterministic frame sequences of the real Cykla web build.
//
// Every shot runs in a fresh copy of a seeded browser profile (synthetic data,
// entered through the app's own UI by app-driver.mjs). The page clock is
// Playwright's fake clock: the date is frozen to the demo day and each recorded
// frame advances exactly 1/30 s, so navigation and modal animations play back
// identically on every run regardless of how long a screenshot takes.
// Tap positions are saved alongside the frames so the video can draw touches.
//
// Usage:
//   node scripts/capture.mjs                 seed if needed, capture all shots
//   node scripts/capture.mjs record explain  capture selected shots
//   node scripts/capture.mjs --reseed        rebuild the seeded profiles first

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  AFTER_PROFILE,
  BASE_PROFILE,
  BASE_URL,
  PHONE,
  VIDEO_DIR,
  cloneProfile,
  freshProfile,
  launch,
  seedBaseProfile,
  waitForText,
} from './app-driver.mjs';
import { DEMO_NOW } from './demo-data.mjs';
import { startServer } from './serve.mjs';

const FPS = 30;
const STEP = 1000 / FPS;
const OUT = path.join(VIDEO_DIR, 'public', 'captures');

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Shot steps run at a capture frame:
 *   tap: { button } | { text }           tap the element's centre (must be on screen)
 *   scroll: { by | toText, offset, dur } eased vertical scroll of the visible screen
 * `initialScroll` positions the screen before the first frame.
 * `boxes` are measured on the last frame and exported (CSS px) for overlays.
 */
const SHOTS = {
  onboarding: {
    profile: 'empty',
    route: '/',
    ready: 'A calm place for your cycle',
    frames: 120,
    steps: [{ at: 66, tap: { button: 'Continue without an account' } }],
  },
  record: {
    profile: BASE_PROFILE,
    route: '/',
    ready: 'Log today',
    centerDayStrip: true,
    frames: 330,
    steps: [
      { at: 50, tap: { button: 'Log day' } },
      { at: 100, tap: { button: 'Light' } },
      { at: 126, tap: { button: 'Pain intensity 2' } },
      { at: 152, tap: { button: 'Calm' } },
      { at: 180, scroll: { toText: 'Save entry', offset: 640, dur: 48 } },
      { at: 240, tap: { button: 'Save entry' } },
    ],
    boxes: { statusCard: { text: 'RECORDED' } },
  },
  calendar: {
    profile: AFTER_PROFILE,
    route: '/calendar',
    ready: 'Recorded and calculated',
    frames: 1,
    steps: [],
    boxes: calendarBoxes(),
  },
  calendarDark: {
    profile: AFTER_PROFILE,
    scheme: 'dark',
    route: '/calendar',
    ready: 'Recorded and calculated',
    frames: 1,
    steps: [],
  },
  explain: {
    profile: AFTER_PROFILE,
    scheme: 'dark',
    route: '/prediction',
    ready: 'How your estimate is made',
    frames: 240,
    steps: [
      { at: 30, scroll: { toText: '1. Recorded starts', offset: 150, dur: 60 } },
      { at: 120, scroll: { toText: '3. A range, not an exact day', offset: 150, dur: 70 } },
    ],
  },
  privacy: {
    profile: AFTER_PROFILE,
    scheme: 'dark',
    route: '/settings',
    ready: 'Your data',
    frames: 150,
    // Starts below the language picker, whose options include the word "Deutsch".
    initialScroll: { toText: 'Reminders & protection', offset: 40 },
    steps: [{ at: 24, scroll: { toText: 'Your data', offset: 110, dur: 66 } }],
  },
};

function calendarBoxes() {
  const cell = (day, month = 'October') => ({ button: new RegExp(`^${month} ${day}, 2026`) });
  const boxes = {};
  for (const day of [1, 2, 3, 4, 5]) boxes[`period${day}`] = cell(day);
  for (const day of [11, 12, 13, 14, 15, 16, 17]) boxes[`fertile${day}`] = cell(day);
  for (const day of [27, 28, 29, 30, 31]) boxes[`window${day}`] = cell(day);
  boxes.window32 = cell(1, 'November');
  boxes.window33 = cell(2, 'November');
  boxes.monthCard = { text: 'Mon' };
  return boxes;
}

function locate(page, spec) {
  if (spec.button) return page.getByRole('button', { name: spec.button, exact: true }).first();
  return page.getByText(spec.text, { exact: true }).first();
}

async function centreOf(page, spec) {
  const box = await locate(page, spec).boundingBox();
  if (!box) throw new Error(`Not found: ${JSON.stringify(spec)}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (y < 0 || y > PHONE.height) throw new Error(`Off screen (${Math.round(y)}): ${JSON.stringify(spec)}`);
  return [x, y];
}

/** The visible vertical scroll container of the current screen (RN-web ScrollView). */
const SCROLLER = `(() => {
  const all = [...document.querySelectorAll('div')].filter((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1 &&
      rect.width > 200 && rect.height > 200 && rect.left >= -1 && rect.right <= innerWidth + 1;
  });
  all.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
  return all[0] ?? null;
})()`;

async function scrollTop(page) {
  return page.evaluate(`(${SCROLLER})?.scrollTop ?? 0`);
}

async function setScrollTop(page, y) {
  await page.evaluate(`(() => { const s = ${SCROLLER}; if (s) s.scrollTop = ${y}; })()`);
}

/** Centres the selected day in the Today day strip, as if the user had swiped to it. */
async function centreDayStrip(page) {
  await page.evaluate(() => {
    const strips = [...document.querySelectorAll('div')].filter((el) => {
      const style = getComputedStyle(el);
      return /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
    });
    const strip = strips[0];
    if (!strip) return;
    const tiles = strip.querySelectorAll('[role="button"], button');
    const selected = tiles[5];
    if (!selected) return;
    const stripRect = strip.getBoundingClientRect();
    const tileRect = selected.getBoundingClientRect();
    strip.scrollLeft += tileRect.left + tileRect.width / 2 - (stripRect.left + stripRect.width / 2);
  });
}

async function advance(page, frames = 1) {
  await page.clock.runFor(STEP * frames);
}

async function captureShot(name, shot) {
  const profile =
    shot.profile === 'empty' ? await freshProfile(name) : await cloneProfile(name, shot.profile);
  const { context, page } = await launch(profile, { colorScheme: shot.scheme ?? 'light' });
  try {
    await page.clock.install({ time: new Date(DEMO_NOW) });
    await page.goto(BASE_URL + shot.route);
    await waitForText(page, shot.ready);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(now + 1000));
    if (shot.centerDayStrip) await centreDayStrip(page);
    if (shot.initialScroll) {
      const box = await page.getByText(shot.initialScroll.toText, { exact: true }).first().boundingBox();
      await setScrollTop(page, (await scrollTop(page)) + box.y - shot.initialScroll.offset);
    }
    await advance(page, 15);

    const dir = path.join(OUT, name);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    const taps = [];
    let scroll = null;
    for (let f = 0; f < shot.frames; f++) {
      for (const step of shot.steps.filter((s) => s.at === f)) {
        if (step.tap) {
          const [x, y] = await centreOf(page, step.tap);
          taps.push({ frame: f, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
          await page.mouse.click(x, y);
        }
        if (step.scroll) {
          const from = await scrollTop(page);
          let by = step.scroll.by ?? 0;
          if (step.scroll.toText) {
            const box = await page.getByText(step.scroll.toText, { exact: true }).first().boundingBox();
            by = box.y - step.scroll.offset;
          }
          scroll = { from, by, start: f, dur: step.scroll.dur };
        }
      }
      if (scroll) {
        const t = Math.min(1, (f - scroll.start) / scroll.dur);
        await setScrollTop(page, scroll.from + scroll.by * ease(t));
        if (t >= 1) scroll = null;
      }
      await advance(page);
      await page.screenshot({
        path: path.join(dir, `${String(f).padStart(4, '0')}.jpg`),
        type: 'jpeg',
        quality: 92,
      });
      if (f % 30 === 0) process.stdout.write(`  ${name} ${f}/${shot.frames}\r`);
    }

    const boxes = {};
    for (const [key, spec] of Object.entries(shot.boxes ?? {})) {
      const box = await locate(page, spec).boundingBox();
      if (box) boxes[key] = { x: box.x, y: box.y, w: box.width, h: box.height };
      else console.warn(`  [${name}] no box for ${key}`);
    }
    const meta = {
      name,
      frames: shot.frames,
      viewport: { width: PHONE.width, height: PHONE.height },
      dpr: PHONE.dpr,
      scheme: shot.scheme ?? 'light',
      taps,
      boxes,
    };
    await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(meta, null, 2));
    console.log(`  ${name}: ${shot.frames} frames`);
  } finally {
    await context.close();
  }
}

const args = process.argv.slice(2);
const only = args.filter((arg) => !arg.startsWith('--'));
const server = await startServer();
try {
  if (args.includes('--reseed') || !existsSync(BASE_PROFILE) || !existsSync(AFTER_PROFILE)) {
    await seedBaseProfile();
  }
  for (const [name, shot] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(name)) continue;
    await captureShot(name, shot);
  }
} finally {
  server.close();
}
