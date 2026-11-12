import {
  federalObservedDate,
  formatCivilDate,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
  parseCivilDate,
} from "@/lib/campaigns/occasions/calendar";
import type {
  CivilDate,
  OccasionDefinition,
  OccasionRule,
} from "@/lib/campaigns/occasions/types";

export type OccasionDisplayDate = {
  date: CivilDate;
  dateRole: "actual" | "observed";
};

function datesForRuleInYear(
  rule: OccasionRule,
  year: number
): OccasionDisplayDate[] {
  if (rule.type === "fixed_md") {
    const actual = formatCivilDate(year, rule.month, rule.day);
    const parsed = parseCivilDate(actual);
    if (!parsed) return [];

    if (rule.dateRole === "observed" || rule.observe === "federal") {
      const observed = federalObservedDate(year, rule.month, rule.day);
      if (!observed) return [];
      if (rule.dateRole === "observed") {
        return [{ date: observed, dateRole: "observed" }];
      }
      return [{ date: actual, dateRole: "actual" }];
    }

    return [{ date: actual, dateRole: rule.dateRole ?? "actual" }];
  }

  if (rule.type === "nth_weekday") {
    const date = nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.n);
    return date ? [{ date, dateRole: "actual" }] : [];
  }

  if (rule.type === "last_weekday") {
    const date = lastWeekdayOfMonth(year, rule.month, rule.weekday);
    return date ? [{ date, dateRole: "actual" }] : [];
  }

  if (rule.type === "custom_once") {
    const parsed = parseCivilDate(rule.date);
    if (!parsed || parsed.year !== year) return [];
    return [{ date: rule.date, dateRole: "actual" }];
  }

  return [];
}

export function displayDatesForOccasionInYear(
  occasion: OccasionDefinition,
  year: number
): OccasionDisplayDate[] {
  if (occasion.kind === "customer_milestone") return [];
  return datesForRuleInYear(occasion.rule, year);
}

export function displayDatesForCustomOccurrence(
  occurrenceDate: string | undefined,
  year: number,
  month?: number
): OccasionDisplayDate[] {
  if (!occurrenceDate) return [];
  const parsed = parseCivilDate(occurrenceDate);
  if (!parsed || parsed.year !== year) return [];
  if (month != null && parsed.month !== month) return [];
  return [{ date: occurrenceDate, dateRole: "actual" }];
}

export function isSameMonth(date: CivilDate, year: number, month: number) {
  const parsed = parseCivilDate(date);
  return Boolean(parsed && parsed.year === year && parsed.month === month);
}
