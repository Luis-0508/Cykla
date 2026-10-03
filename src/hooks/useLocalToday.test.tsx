import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { msUntilNextLocalDay, useLocalToday } from './useLocalToday';

const appState = vi.hoisted(() => ({
  listeners: new Set<(state: string) => void>(),
}));
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_type: string, listener: (state: string) => void) => {
      appState.listeners.add(listener);
      return { remove: () => appState.listeners.delete(listener) };
    },
  },
}));

const renders: string[] = [];
function Probe() {
  const today = useLocalToday();
  renders.push(today);
  return createElement('Text', null, today);
}

describe('useLocalToday', () => {
  const originalTimeZone = process.env.TZ;
  let screens: ReactTestRenderer[] = [];

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    renders.length = 0;
    screens = [];
  });
  afterEach(async () => {
    await act(async () => screens.forEach((screen) => screen.unmount()));
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });

  async function mount() {
    await act(async () => {
      screens.push(create(createElement(Probe)));
    });
  }
  const shown = () => renders.at(-1);

  it('switches to the new day at local midnight while mounted', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
    await mount();
    expect(shown()).toBe('2026-10-03');
    await act(async () => {
      vi.advanceTimersByTime(29_000);
    });
    expect(shown()).toBe('2026-10-03');
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(shown()).toBe('2026-10-04');
    // And again a day later: the timer re-arms itself.
    await act(async () => {
      vi.advanceTimersByTime(24 * 3_600_000);
    });
    expect(shown()).toBe('2026-10-05');
  });

  it('refreshes when the app returns on a new day, even if no timer fired', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 22, 0));
    await mount();
    // Suspended overnight: the clock moves on, timers do not run.
    vi.setSystemTime(new Date(2026, 9, 4, 7, 30));
    expect(shown()).toBe('2026-10-03');
    await act(async () => appState.listeners.forEach((listener) => listener('active')));
    expect(shown()).toBe('2026-10-04');
  });

  it('does not re-render while the day stays the same', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 10, 0));
    await mount();
    const before = renders.length;
    await act(async () => {
      vi.advanceTimersByTime(6 * 3_600_000);
      appState.listeners.forEach((listener) => listener('active'));
      appState.listeners.forEach((listener) => listener('background'));
    });
    expect(renders.length).toBe(before);
    expect(shown()).toBe('2026-10-03');
  });

  it('shares one timer and listener between consumers and cleans them up', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
    await mount();
    await mount();
    await mount();
    expect(vi.getTimerCount()).toBe(1);
    expect(appState.listeners.size).toBe(1);
    await act(async () => screens.splice(0).forEach((screen) => screen.unmount()));
    expect(vi.getTimerCount()).toBe(0);
    expect(appState.listeners.size).toBe(0);
  });

  it('reads the current day on remount after a long pause', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
    await mount();
    await act(async () => screens.splice(0).forEach((screen) => screen.unmount()));
    vi.setSystemTime(new Date(2026, 9, 6, 9, 0));
    await mount();
    expect(shown()).toBe('2026-10-06');
  });

  it.each([
    // Europe/Berlin: 23-hour spring day and 25-hour autumn day.
    ['Europe/Berlin', [2026, 2, 29, 0, 30], 22.5],
    ['Europe/Berlin', [2026, 9, 25, 0, 30], 24.5],
    ['America/Los_Angeles', [2026, 2, 8, 0, 30], 22.5],
    ['America/Los_Angeles', [2026, 10, 1, 0, 30], 24.5],
  ] as const)('waits until the next local midnight in %s on DST days', (timeZone, parts, hours) => {
    process.env.TZ = timeZone;
    const [year, month, day, hour, minute] = parts;
    const now = new Date(year, month, day, hour, minute);
    expect(msUntilNextLocalDay(now)).toBe(hours * 3_600_000 + 1_000);
  });

  it('crosses a DST midnight while mounted', async () => {
    process.env.TZ = 'Europe/Berlin';
    vi.setSystemTime(new Date(2026, 2, 29, 0, 30));
    await mount();
    await act(async () => {
      vi.advanceTimersByTime(22.5 * 3_600_000 - 5_000);
    });
    expect(shown()).toBe('2026-03-29');
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(shown()).toBe('2026-03-30');
  });
});
