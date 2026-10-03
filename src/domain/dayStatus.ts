import { compareDates, differenceInDays } from '@/domain/dateOnly';
import type { Prediction } from '@/domain/models';

export type DayStatus =
  // No period start is recorded yet.
  | { kind: 'none' }
  // A later period start is already recorded, so this day belongs to a finished cycle.
  // `cycleDay` is null before the first recorded start.
  | { kind: 'pastCycle'; cycleDay: number | null }
  // The estimated window has passed without a newer recorded start.
  | { kind: 'overdue'; windowEnd: string }
  // Long cycles or missed entries: only the wide window is shown, never a day count.
  | { kind: 'uncertain'; windowStart: string; windowEnd: string }
  // Days from the selected day to the estimated midpoint; 0 means around that day.
  | { kind: 'countdown'; days: number }
  // Past the midpoint but still inside the estimated window.
  | { kind: 'inWindow'; windowStart: string }
  // A future day after the estimated window; there is no estimate for it.
  | { kind: 'beyondEstimate' };

/**
 * What the Today card may say about `date`. A countdown is only derived for days in
 * the current, open cycle; past days never count towards today's estimate.
 */
export function describeDayStatus(
  date: string,
  starts: string[],
  prediction: Prediction | null,
): DayStatus {
  const sorted = [...starts].sort(compareDates);
  if (sorted.some((start) => compareDates(start, date) > 0)) {
    const cycleStart = sorted.filter((start) => compareDates(start, date) <= 0).at(-1);
    return {
      kind: 'pastCycle',
      cycleDay: cycleStart ? differenceInDays(date, cycleStart) + 1 : null,
    };
  }
  if (!prediction) return { kind: 'none' };
  if (prediction.overdue) return { kind: 'overdue', windowEnd: prediction.windowEnd };
  if (prediction.uncertainHistory && compareDates(date, prediction.windowEnd) <= 0) {
    return {
      kind: 'uncertain',
      windowStart: prediction.windowStart,
      windowEnd: prediction.windowEnd,
    };
  }
  const days = differenceInDays(prediction.expectedStart, date);
  if (days >= 0) return { kind: 'countdown', days };
  if (compareDates(date, prediction.windowEnd) <= 0) {
    return { kind: 'inWindow', windowStart: prediction.windowStart };
  }
  return { kind: 'beyondEstimate' };
}
