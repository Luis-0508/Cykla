// Synthetic demo dataset. Invented for the video; it is not real health data.
//
// Six recorded period starts give five complete cycles (29, 27, 30, 28, 29 days).
// With the app's own model that yields medium confidence (fewer than six
// cycles), a ±3 day prediction window around Oct 30 and a possible fertile
// window of Oct 11–17. The recorded period, the fertile window and the
// prediction window all fit into the October month view.
//
// "Today" is Oct 5, day 5 of the current period. That day is deliberately not
// seeded: it is logged live on camera (LIVE_ENTRY), which flips the Today card
// from ESTIMATE to RECORDED.

/** The app's "today" during every capture (local time). */
export const DEMO_NOW = '2026-10-05T09:30:00';
export const DEMO_TODAY = '2026-10-05';

export const ONBOARDING = { goal: 'Track my cycle', lastPeriodDate: '2026-05-11' };

const STARTS = ['2026-05-11', '2026-06-09', '2026-07-06', '2026-08-05', '2026-09-02', '2026-10-01'];

export function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Small, deterministic variation between cycles.
const PERIOD_SHAPES = [
  ['Medium', 'Heavy', 'Medium', 'Light'],
  ['Medium', 'Heavy', 'Medium', 'Light', 'Spotting'],
  ['Light', 'Heavy', 'Heavy', 'Medium', 'Light'],
  ['Medium', 'Heavy', 'Medium', 'Light'],
  ['Medium', 'Medium', 'Light', 'Light', 'Spotting'],
  ['Medium', 'Heavy', 'Medium', 'Light'],
];

/**
 * Entries use the visible English labels of the daily editor:
 * flow (chip label), pain (0–10, even), mood (chip label), energy (1–5),
 * sleep (hours) and symptoms (chip labels).
 */
export function demoEntries() {
  const entries = [];
  STARTS.forEach((start, cycle) => {
    PERIOD_SHAPES[cycle].forEach((flow, day) => {
      const entry = { date: addDays(start, day), flow };
      if (day === 0) Object.assign(entry, { pain: 4, symptoms: ['Cramps'] });
      if (day === 1) {
        Object.assign(entry, { pain: 6, mood: 'Sensitive', symptoms: ['Cramps', 'Back pain'] });
      }
      if (day === 2) Object.assign(entry, { pain: 2, energy: 2 });
      entries.push(entry);
    });
    if (cycle < STARTS.length - 1) {
      entries.push({ date: addDays(start, 13), mood: 'Content', energy: 4, sleep: 7.5 });
      entries.push({ date: addDays(start, 23), mood: 'Irritable', symptoms: ['Headache', 'Bloating'] });
    }
  });
  // A couple of quieter days before the current period.
  entries.push({ date: '2026-09-28', mood: 'Sensitive', symptoms: ['Breast tenderness'] });
  entries.push({ date: '2026-09-30', mood: 'Calm', energy: 3, sleep: 7 });
  return entries;
}

/** What gets logged live on camera for "today" (day 5 of the current period). */
export const LIVE_ENTRY = { date: DEMO_TODAY, flow: 'Light', pain: 2, mood: 'Calm' };
