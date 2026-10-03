import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';
import { todayDate } from '@/domain/dateOnly';

// Lands safely after midnight even if a timer fires a little early.
const AFTER_MIDNIGHT_MS = 1_000;

/** Milliseconds until shortly after the next local midnight; DST days are 23 or 25 hours. */
export function msUntilNextLocalDay(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime() + AFTER_MIDNIGHT_MS;
}

// One shared timer and AppState listener for all mounted consumers.
const listeners = new Set<() => void>();
let current = todayDate();
let timer: ReturnType<typeof setTimeout> | undefined;
let appStateSubscription: NativeEventSubscription | undefined;

function refresh() {
  const next = todayDate();
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

// Timers can be delayed or paused while the app is suspended; resuming refreshes too.
function scheduleNextDay() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    refresh();
    scheduleNextDay();
  }, msUntilNextLocalDay(new Date()));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    scheduleNextDay();
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refresh();
      scheduleNextDay();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearTimeout(timer);
    timer = undefined;
    appStateSubscription?.remove();
    appStateSubscription = undefined;
  };
}

function getSnapshot() {
  // Without subscribers nothing keeps `current` fresh, so read the clock directly.
  if (listeners.size === 0) current = todayDate();
  return current;
}

/** The device's local calendar day, updated at midnight and when the app returns. */
export function useLocalToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
