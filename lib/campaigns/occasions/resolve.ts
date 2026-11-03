import {
  anniversaryInYear,
  compareCivil,
  federalObservedDate,
  formatCivilDate,
  isWithinInclusive,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
  parseCivilDate,
  subtractDays,
  yearsSpanned,
} from "@/lib/campaigns/occasions/calendar";
import type {
  CivilDate,
  CustomerMilestoneInput,
  OccasionDefinition,
  OccasionOccurrence,
  OccasionRule,
  ResolveOccurrencesInput,
  ResolveOccurrencesResult,
  SkippedOccurrence,
} from "@/lib/campaigns/occasions/types";

function pushSkip(
  skipped: SkippedOccurrence[],
  occasion: OccasionDefinition,
  reason: SkippedOccurrence["reason"],
  customerId?: string,
  detail?: string
) {
  skipped.push({
    occasionSlug: occasion.slug,
    occasionName: occasion.name,
    customerId,
    reason,
    detail,
  });
}

function datesForRuleInYear(
  rule: OccasionRule,
  year: number
): { date: CivilDate; dateRole: "actual" | "observed" }[] {
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

function milestoneSkipReason(
  milestoneType: string
): SkippedOccurrence["reason"] {
  if (milestoneType === "birthday") return "missing_birthday";
  if (milestoneType === "closing_anniversary") return "missing_closing_date";
  if (milestoneType === "home_anniversary") return "missing_home_anniversary";
  return "missing_milestone";
}

function activeMilestonesOfType(
  milestones: CustomerMilestoneInput[],
  milestoneType: string
): CustomerMilestoneInput[] {
  return milestones.filter(
    (m) =>
      m.milestoneType === milestoneType &&
      m.isActive !== false &&
      Boolean(m.anchorDate)
  );
}

export function resolveOccasionOccurrences(
  input: ResolveOccurrencesInput
): ResolveOccurrencesResult {
  const { occasion, customerId, milestones, startDate, endDate } = input;
  const occurrences: OccasionOccurrence[] = [];
  const skipped: SkippedOccurrence[] = [];

  if (!parseCivilDate(startDate) || !parseCivilDate(endDate)) {
    pushSkip(skipped, occasion, "invalid_rule", customerId, "Invalid campaign dates");
    return { occurrences, skipped };
  }

  if (compareCivil(startDate, endDate) > 0) {
    pushSkip(
      skipped,
      occasion,
      "invalid_rule",
      customerId,
      "startDate must be <= endDate"
    );
    return { occurrences, skipped };
  }

  if (occasion.isActive === false) {
    pushSkip(skipped, occasion, "occasion_disabled", customerId);
    return { occurrences, skipped };
  }

  if (input.excludedCustomerIds?.includes(customerId)) {
    pushSkip(skipped, occasion, "customer_excluded", customerId);
    return { occurrences, skipped };
  }

  const leadDays = input.leadDays ?? occasion.defaultLeadDays ?? 7;
  const rule = occasion.rule;

  if (rule.type === "milestone_annual") {
    const matches = activeMilestonesOfType(milestones, rule.milestone_type);
    if (matches.length === 0) {
      pushSkip(
        skipped,
        occasion,
        milestoneSkipReason(rule.milestone_type),
        customerId
      );
      return { occurrences, skipped };
    }

    for (const milestone of matches) {
      if (milestone.recursAnnually === false) {
        if (isWithinInclusive(milestone.anchorDate, startDate, endDate)) {
          const sendOn =
            subtractDays(milestone.anchorDate, leadDays) ?? milestone.anchorDate;
          occurrences.push({
            occasionSlug: occasion.slug,
            occasionName: occasion.name,
            occasionCategory: occasion.category,
            customerId,
            milestoneId: milestone.id,
            occasionDate: milestone.anchorDate,
            sendOn,
            leadDays,
            dateRole: "actual",
            source: "milestone",
          });
        } else {
          pushSkip(
            skipped,
            occasion,
            "non_recurring_exhausted",
            customerId,
            `Anchor ${milestone.anchorDate} outside campaign window`
          );
        }
        continue;
      }

      for (const year of yearsSpanned(startDate, endDate)) {
        const occasionDate = anniversaryInYear(milestone.anchorDate, year);
        if (!occasionDate) {
          pushSkip(
            skipped,
            occasion,
            "invalid_rule",
            customerId,
            `Invalid anniversary for ${year}`
          );
          continue;
        }
        if (!isWithinInclusive(occasionDate, startDate, endDate)) continue;

        const sendOn = subtractDays(occasionDate, leadDays) ?? occasionDate;
        occurrences.push({
          occasionSlug: occasion.slug,
          occasionName: occasion.name,
          occasionCategory: occasion.category,
          customerId,
          milestoneId: milestone.id,
          occasionDate,
          sendOn,
          leadDays,
          dateRole: "actual",
          source: "milestone",
        });
      }
    }

    return { occurrences, skipped };
  }

  if (rule.type === "custom_once") {
    if (!parseCivilDate(rule.date)) {
      pushSkip(skipped, occasion, "invalid_rule", customerId, "Invalid custom date");
      return { occurrences, skipped };
    }
    if (!isWithinInclusive(rule.date, startDate, endDate)) {
      pushSkip(skipped, occasion, "outside_window", customerId, rule.date);
      return { occurrences, skipped };
    }
    const sendOn = subtractDays(rule.date, leadDays) ?? rule.date;
    occurrences.push({
      occasionSlug: occasion.slug,
      occasionName: occasion.name,
      occasionCategory: occasion.category,
      customerId,
      occasionDate: rule.date,
      sendOn,
      leadDays,
      dateRole: "actual",
      source: "custom",
    });
    return { occurrences, skipped };
  }

  for (const year of yearsSpanned(startDate, endDate)) {
    const dated = datesForRuleInYear(rule, year);
    if (dated.length === 0 && (rule.type === "nth_weekday" || rule.type === "last_weekday" || rule.type === "fixed_md")) {
      if (year === yearsSpanned(startDate, endDate)[0]) {
        pushSkip(skipped, occasion, "invalid_rule", customerId);
      }
      continue;
    }

    for (const { date, dateRole } of dated) {
      if (!isWithinInclusive(date, startDate, endDate)) continue;
      const sendOn = subtractDays(date, leadDays) ?? date;
      occurrences.push({
        occasionSlug: occasion.slug,
        occasionName: occasion.name,
        occasionCategory: occasion.category,
        customerId,
        occasionDate: date,
        sendOn,
        leadDays,
        dateRole,
        source: "calendar",
      });
    }
  }

  return { occurrences, skipped };
}

export function resolveManyOccasions(options: {
  occasions: OccasionDefinition[];
  customerId: string;
  milestones: CustomerMilestoneInput[];
  startDate: CivilDate;
  endDate: CivilDate;
  timezone?: string;
  excludedByOccasion?: Record<string, string[]>;
}): ResolveOccurrencesResult {
  const occurrences: OccasionOccurrence[] = [];
  const skipped: SkippedOccurrence[] = [];

  for (const occasion of options.occasions) {
    const result = resolveOccasionOccurrences({
      occasion,
      customerId: options.customerId,
      milestones: options.milestones,
      startDate: options.startDate,
      endDate: options.endDate,
      timezone: options.timezone,
      excludedCustomerIds: options.excludedByOccasion?.[occasion.slug],
    });
    occurrences.push(...result.occurrences);
    skipped.push(...result.skipped);
  }

  occurrences.sort((a, b) => {
    const byDate = compareCivil(a.occasionDate, b.occasionDate);
    if (byDate !== 0) return byDate;
    return a.customerId.localeCompare(b.customerId);
  });

  return { occurrences, skipped };
}
