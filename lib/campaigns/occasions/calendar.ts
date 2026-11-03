import type { CivilDate } from "@/lib/campaigns/occasions/types";

const CIVIL_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCivilDate(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = CIVIL_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidYmd(year, month, day)) return null;
  return { year, month, day };
}

export function formatCivilDate(year: number, month: number, day: number): CivilDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isWithinInclusive(
  date: CivilDate,
  start: CivilDate,
  end: CivilDate
): boolean {
  return compareCivil(date, start) >= 0 && compareCivil(date, end) <= 0;
}

export function addDays(date: CivilDate, days: number): CivilDate | null {
  const parsed = parseCivilDate(date);
  if (!parsed) return null;
  const dt = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatCivilDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function subtractDays(date: CivilDate, days: number): CivilDate | null {
  return addDays(date, -days);
}

export function weekdayUtc(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): CivilDate | null {
  if (n < 1 || n > 5 || weekday < 0 || weekday > 6) return null;
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    if (!isValidYmd(year, month, day)) break;
    if (weekdayUtc(year, month, day) === weekday) {
      count += 1;
      if (count === n) return formatCivilDate(year, month, day);
    }
  }
  return null;
}

export function lastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number
): CivilDate | null {
  if (weekday < 0 || weekday > 6) return null;
  for (let day = 31; day >= 1; day--) {
    if (!isValidYmd(year, month, day)) continue;
    if (weekdayUtc(year, month, day) === weekday) {
      return formatCivilDate(year, month, day);
    }
  }
  return null;
}

export function federalObservedDate(
  year: number,
  month: number,
  day: number
): CivilDate | null {
  if (!isValidYmd(year, month, day)) return null;
  const wd = weekdayUtc(year, month, day);
  if (wd === 6) return subtractDays(formatCivilDate(year, month, day), 1);
  if (wd === 0) return addDays(formatCivilDate(year, month, day), 1);
  return formatCivilDate(year, month, day);
}

export function anniversaryInYear(
  anchor: CivilDate,
  year: number
): CivilDate | null {
  const parsed = parseCivilDate(anchor);
  if (!parsed) return null;
  let { month, day } = parsed;
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    day = 28;
  }
  if (!isValidYmd(year, month, day)) return null;
  return formatCivilDate(year, month, day);
}

export function yearsSpanned(start: CivilDate, end: CivilDate): number[] {
  const s = parseCivilDate(start);
  const e = parseCivilDate(end);
  if (!s || !e || compareCivil(start, end) > 0) return [];
  const years: number[] = [];
  for (let y = s.year; y <= e.year; y++) years.push(y);
  return years;
}
