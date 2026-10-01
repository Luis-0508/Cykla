const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function parseDateOnly(date: string): Date {
  const match = DATE_ONLY.exec(date);
  if (!match) {
    throw new Error(`Ungültiges Kalenderdatum: ${date}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Ungültiges Kalenderdatum: ${date}`);
  }
  return parsed;
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const value = parseDateOnly(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateOnly(value);
}

export function differenceInDays(later: string, earlier: string): number {
  return Math.round((parseDateOnly(later).getTime() - parseDateOnly(earlier).getTime()) / DAY_MS);
}

export function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function eachDay(start: string, end: string): string[] {
  const count = differenceInDays(end, start);
  if (count < 0) return [];
  return Array.from({ length: count + 1 }, (_, index) => addDays(start, index));
}

// Formats a calendar date in UTC so the shown day never shifts with the time zone.
export function formatCalendarDate(
  date: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const formatOptions: Intl.DateTimeFormatOptions = options ?? {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    ...formatOptions,
  }).format(parseDateOnly(date));
}

export function startOfMonth(date: string): string {
  const value = parseDateOnly(date);
  value.setUTCDate(1);
  return formatDateOnly(value);
}

export function addMonths(date: string, months: number): string {
  const value = parseDateOnly(startOfMonth(date));
  value.setUTCMonth(value.getUTCMonth() + months);
  return formatDateOnly(value);
}

export function monthGrid(date: string): string[] {
  const first = parseDateOnly(startOfMonth(date));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const gridStart = addDays(formatDateOnly(first), -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}
