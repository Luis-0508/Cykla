import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  differenceInDays,
  eachDay,
  formatGermanDate,
  monthGrid,
  parseDateOnly,
  startOfMonth,
} from './dateOnly';
describe('calendar boundaries', () => {
  it.each([
    '',
    '2026-2-01',
    '2026-00-01',
    '2026-13-01',
    '2026-04-31',
    '2026-01-00',
    '2026-01-01T00:00:00Z',
  ])('rejects malformed dates %s', (date) => {
    expect(() => parseDateOnly(date)).toThrow();
  });
  it('uses calendar days across both daylight saving transitions', () => {
    expect(differenceInDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(differenceInDays('2026-10-26', '2026-10-24')).toBe(2);
    expect(addDays('2026-03-30', -2)).toBe('2026-03-28');
  });
  it('includes endpoints and handles reversed ranges', () => {
    expect(eachDay('2028-02-28', '2028-03-01')).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
    expect(eachDay('2026-01-02', '2026-01-01')).toEqual([]);
    expect(eachDay('2026-01-01', '2026-01-01')).toEqual(['2026-01-01']);
  });
  it('anchors month navigation and starts the 42-day grid on Monday', () => {
    expect(startOfMonth('2026-12-31')).toBe('2026-12-01');
    expect(addMonths('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
    const grid = monthGrid('2026-02-01');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-01-26');
    expect(grid.at(-1)).toBe('2026-03-08');
    expect(formatGermanDate('2026-02-01')).toContain('Februar');
  });
});
