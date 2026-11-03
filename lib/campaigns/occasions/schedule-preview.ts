import { compareCivil } from "@/lib/campaigns/occasions/calendar";
import { resolveOccasionOccurrences } from "@/lib/campaigns/occasions/resolve";
import type {
  CivilDate,
  CustomerMilestoneInput,
  OccasionDefinition,
  OccasionOccurrence,
  SkippedOccurrence,
} from "@/lib/campaigns/occasions/types";

export type SchedulePreviewCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  milestones: CustomerMilestoneInput[];
};

export type SchedulePreviewInput = {
  startDate: CivilDate;
  endDate: CivilDate;
  timezone: string;
  customers: SchedulePreviewCustomer[];
  occasions: OccasionDefinition[];
  exclusionsByOccasionSlug?: Record<string, string[]>;
  leadDaysByOccasionSlug?: Record<string, number>;
};

export type SchedulePreviewResult = {
  startDate: CivilDate;
  endDate: CivilDate;
  timezone: string;
  upcomingOccasions: OccasionOccurrence[];
  eligibleCustomerIds: string[];
  skipped: SkippedOccurrence[];
  expectedCardCount: number;
  summary: {
    customerCount: number;
    occasionCount: number;
    occurrenceCount: number;
    skippedCount: number;
  };
};

export function previewCampaignSchedule(
  input: SchedulePreviewInput
): SchedulePreviewResult {
  const upcomingOccasions: OccasionOccurrence[] = [];
  const skipped: SkippedOccurrence[] = [];
  const eligible = new Set<string>();

  for (const customer of input.customers) {
    for (const occasion of input.occasions) {
      const result = resolveOccasionOccurrences({
        occasion,
        customerId: customer.id,
        milestones: customer.milestones.map((m) => ({
          ...m,
          customerId: customer.id,
        })),
        startDate: input.startDate,
        endDate: input.endDate,
        timezone: input.timezone,
        leadDays: input.leadDaysByOccasionSlug?.[occasion.slug],
        excludedCustomerIds:
          input.exclusionsByOccasionSlug?.[occasion.slug] ?? [],
      });

      for (const occ of result.occurrences) {
        if (compareCivil(occ.occasionDate, input.endDate) > 0) continue;
        if (compareCivil(occ.occasionDate, input.startDate) < 0) continue;
        upcomingOccasions.push(occ);
        eligible.add(customer.id);
      }
      skipped.push(...result.skipped);
    }
  }

  upcomingOccasions.sort((a, b) => {
    const d = compareCivil(a.occasionDate, b.occasionDate);
    if (d !== 0) return d;
    const c = a.customerId.localeCompare(b.customerId);
    if (c !== 0) return c;
    return a.occasionSlug.localeCompare(b.occasionSlug);
  });

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    timezone: input.timezone,
    upcomingOccasions,
    eligibleCustomerIds: [...eligible],
    skipped,
    expectedCardCount: upcomingOccasions.length,
    summary: {
      customerCount: input.customers.length,
      occasionCount: input.occasions.length,
      occurrenceCount: upcomingOccasions.length,
      skippedCount: skipped.length,
    },
  };
}
