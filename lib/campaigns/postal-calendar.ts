

import type { CivilDate } from "@/lib/campaigns/occasions/types";
import {
  addDays,
  federalObservedDate,
  formatCivilDate,
  nthWeekdayOfMonth,
  parseCivilDate,
  subtractDays,
  weekdayUtc,
} from "@/lib/campaigns/occasions/calendar";

const FIXED_USPS_HOLIDAYS: Array<{ month: number; day: number }> = [
  { month: 1, day: 1 },
  { month: 6, day: 19 },
  { month: 7, day: 4 },
  { month: 11, day: 11 },
  { month: 12, day: 25 },
];

function thanksgiving(year: number): CivilDate | null {
  return nthWeekdayOfMonth(year, 11, 4, 4);
}

function memorialDay(year: number): CivilDate | null {
  for (let day = 31; day >= 25; day--) {
    const date = formatCivilDate(year, 5, day);
    const parsed = parseCivilDate(date);
    if (!parsed) continue;
    if (weekdayUtc(year, 5, day) === 1) return date;
  }
  return null;
}

function laborDay(year: number): CivilDate | null {
  return nthWeekdayOfMonth(year, 9, 1, 1);
}

function mlkDay(year: number): CivilDate | null {
  return nthWeekdayOfMonth(year, 1, 1, 3);
}

function presidentsDay(year: number): CivilDate | null {
  return nthWeekdayOfMonth(year, 2, 1, 3);
}

function columbusDay(year: number): CivilDate | null {
  return nthWeekdayOfMonth(year, 10, 1, 2);
}

export function uspsHolidaysForYear(year: number): Set<CivilDate> {
  const set = new Set<CivilDate>();

  for (const h of FIXED_USPS_HOLIDAYS) {
    const observed = federalObservedDate(year, h.month, h.day);
    if (observed) set.add(observed);
  }

  for (const fn of [
    thanksgiving,
    memorialDay,
    laborDay,
    mlkDay,
    presidentsDay,
    columbusDay,
  ]) {
    const d = fn(year);
    if (d) set.add(d);
  }

  return set;
}

export function isWeekend(date: CivilDate): boolean {
  const parsed = parseCivilDate(date);
  if (!parsed) return false;
  const wd = weekdayUtc(parsed.year, parsed.month, parsed.day);
  return wd === 0 || wd === 6;
}

export function isUspsNonDeliveryDay(date: CivilDate): boolean {
  const parsed = parseCivilDate(date);
  if (!parsed) return true;
  if (isWeekend(date)) return true;
  return uspsHolidaysForYear(parsed.year).has(date);
}

export function adjustSendOnForPostalCalendar(sendOn: CivilDate): CivilDate {
  let cursor: CivilDate | null = sendOn;
  let guard = 0;
  while (cursor && isUspsNonDeliveryDay(cursor) && guard < 14) {
    cursor = subtractDays(cursor, 1);
    guard += 1;
  }
  return cursor ?? sendOn;
}

export function computeArtworkPrepareOn(
  sendOn: CivilDate,
  businessDaysBefore = 2
): CivilDate {
  let cursor: CivilDate | null = sendOn;
  let remaining = businessDaysBefore;
  let guard = 0;
  while (cursor && remaining > 0 && guard < 30) {
    cursor = subtractDays(cursor, 1);
    if (cursor && !isUspsNonDeliveryDay(cursor)) {
      remaining -= 1;
    }
    guard += 1;
  }
  return cursor ?? sendOn;
}

export const PROVIDER_PROCESSING_NOTE =
  "PostGrid/USPS processing is not guaranteed; occasion date is not a delivery SLA.";

export function addPostalBusinessDays(
  date: CivilDate,
  days: number
): CivilDate {
  let cursor: CivilDate | null = date;
  let remaining = days;
  let guard = 0;
  while (cursor && remaining > 0 && guard < 60) {
    cursor = addDays(cursor, 1);
    if (cursor && !isUspsNonDeliveryDay(cursor)) {
      remaining -= 1;
    }
    guard += 1;
  }
  return cursor ?? date;
}
