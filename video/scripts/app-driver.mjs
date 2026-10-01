// Shared helpers for driving the real Cykla web build with Playwright.
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { DEMO_NOW, LIVE_ENTRY, ONBOARDING, demoEntries } from './demo-data.mjs';

export const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROFILES = path.join(VIDEO_DIR, '.profiles');
export const BASE_PROFILE = path.join(PROFILES, 'base');
/** Base profile plus today's live entry: the state after the `record` shot. */
export const AFTER_PROFILE = path.join(PROFILES, 'after');
export const PORT = Number(process.env.PORT ?? 8090);
export const BASE_URL = `http://localhost:${PORT}`;

/** Phone-sized viewport; 3× device pixels leave headroom for push-ins. */
export const PHONE = { width: 390, height: 844, dpr: 3 };

export async function launch(profileDir, { colorScheme = 'light', dpr = PHONE.dpr } = {}) {
  await mkdir(profileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: process.env.BROWSER_CHANNEL ?? 'msedge',
    headless: true,
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: dpr,
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    colorScheme,
    reducedMotion: 'no-preference',
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.on('pageerror', (error) => console.warn(`  [page] ${error.message}`));
  return { context, page };
}

/** Freezes the app's calendar date while timers keep running in real time. */
export async function fixDate(page) {
  await page.clock.setFixedTime(new Date(DEMO_NOW));
}

export async function waitForText(page, text, timeout = 20000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

export async function tap(page, name, { exact = true, nth = 0 } = {}) {
  await page.getByRole('button', { name, exact }).nth(nth).click();
}

async function onboard(page) {
  await page.goto(BASE_URL + '/');
  await waitForText(page, 'A calm place for your cycle');
  await tap(page, 'Continue without an account');
  await page.getByText(ONBOARDING.goal, { exact: true }).click();
  await tap(page, 'Continue');
  await page.getByLabel('Start of your last period').fill(ONBOARDING.lastPeriodDate);
  await tap(page, 'Continue');
  await tap(page, 'Continue');
  await tap(page, 'Open Cykla');
  await waitForText(page, 'Log today');
}

export async function fillEntry(page, entry) {
  if (entry.flow) await tap(page, entry.flow);
  if (entry.pain != null) await tap(page, `Pain intensity ${entry.pain}`);
  if (entry.mood) await tap(page, entry.mood);
  if (entry.energy != null) await tap(page, `Energy ${entry.energy}`);
  if (entry.sleep != null) {
    await page.getByLabel('Sleep duration in hours').fill(String(entry.sleep));
  }
  for (const symptom of entry.symptoms ?? []) await tap(page, symptom);
}

/** Client-side route change inside the running app (a reload could cut off a pending write). */
export async function routeTo(page, pathname) {
  await page.evaluate((target) => {
    history.pushState(null, '', target);
    dispatchEvent(new PopStateEvent('popstate', { state: null }));
  }, pathname);
}

export async function logDay(page, entry) {
  await routeTo(page, `/day/${entry.date}`);
  await page.getByText(/^DAILY ENTRY$/).first().waitFor();
  await page.getByText(new Date(`${entry.date}T12:00:00`).getDate().toString()).first().waitFor();
  await page.waitForTimeout(250);
  await fillEntry(page, entry);
  await tap(page, 'Save entry');
  // Without a previous screen the editor stays open; the local write is fast.
  await page.waitForTimeout(600);
}

async function verifySeed(page) {
  await page.goto(BASE_URL + '/insights');
  await waitForText(page, 'from 5 complete cycles');
}

async function seedAfterProfile() {
  await rm(AFTER_PROFILE, { recursive: true, force: true });
  await cp(BASE_PROFILE, AFTER_PROFILE, { recursive: true });
  const { context, page } = await launch(AFTER_PROFILE, { dpr: 1 });
  try {
    await fixDate(page);
    await page.goto(BASE_URL + '/');
    await waitForText(page, 'Log today');
    await logDay(page, LIVE_ENTRY);
    await page.goto(BASE_URL + '/');
    await waitForText(page, 'Recorded period');
  } finally {
    await context.close();
  }
}

/** Builds the base browser profile through the real UI: onboarding plus synthetic entries. */
export async function seedBaseProfile() {
  await rm(BASE_PROFILE, { recursive: true, force: true });
  const { context, page } = await launch(BASE_PROFILE, { dpr: 1 });
  try {
    await fixDate(page);
    await onboard(page);
    const entries = demoEntries();
    for (const [index, entry] of entries.entries()) {
      await logDay(page, entry);
      process.stdout.write(`  seeded ${index + 1}/${entries.length}\r`);
    }
    await verifySeed(page);
    console.log(`  seeded ${entries.length} synthetic entries`);
  } finally {
    await context.close();
  }
  await seedAfterProfile();
}

/** Fresh copy of a seeded profile, so every shot starts from identical data. */
export async function cloneProfile(name, source = BASE_PROFILE) {
  const dir = path.join(PROFILES, `shot-${name}`);
  await rm(dir, { recursive: true, force: true });
  await cp(source, dir, { recursive: true });
  return dir;
}

/** Empty profile for first-run (onboarding) shots. */
export async function freshProfile(name) {
  const dir = path.join(PROFILES, `shot-${name}`);
  await rm(dir, { recursive: true, force: true });
  return dir;
}
