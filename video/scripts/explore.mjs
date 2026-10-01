// Exploration helper: seeds the demo profile (if needed) and screenshots the
// main screens in light and dark mode into out/explore/. Not part of the video.
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  BASE_PROFILE,
  BASE_URL,
  VIDEO_DIR,
  cloneProfile,
  fixDate,
  launch,
  seedBaseProfile,
  waitForText,
} from './app-driver.mjs';
import { startServer } from './serve.mjs';

const out = path.join(VIDEO_DIR, 'out', 'explore');
await mkdir(out, { recursive: true });
const server = await startServer();
try {
  if (!existsSync(BASE_PROFILE) || process.argv.includes('--reseed')) await seedBaseProfile();
  for (const scheme of ['light', 'dark']) {
    const profile = await cloneProfile(`explore-${scheme}`);
    const { context, page } = await launch(profile, { colorScheme: scheme, dpr: 2 });
    await fixDate(page);
    const routes = [
      ['today', '/', 'Log today'],
      ['calendar', '/calendar', 'Recorded and calculated'],
      ['log', '/log', 'Categories'],
      ['trends', '/insights', 'Cycle history'],
      ['you', '/settings', 'Your data'],
      ['prediction', '/prediction', 'How your estimate is made'],
      ['day', '/day/2026-10-02', 'Recorded, not calculated'],
    ];
    for (const [name, route, text] of routes) {
      await page.goto(BASE_URL + route);
      await waitForText(page, text);
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(out, `${scheme}-${name}.png`) });
    }
    await context.close();
  }
} finally {
  server.close();
}
console.log('explore screenshots in', out);
