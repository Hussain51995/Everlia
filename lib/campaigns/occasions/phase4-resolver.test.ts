import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import {
  anniversaryInYear,
  federalObservedDate,
  isLeapYear,
  lastWeekdayOfMonth,
  nthWeekdayOfMonth,
} from "@/lib/campaigns/occasions/calendar";
import {
  getDefaultSelectedOccasions,
  getOccasionBySlug,
  US_OCCASION_CATALOG,
} from "@/lib/campaigns/occasions/catalog";
import { resolveOccasionOccurrences } from "@/lib/campaigns/occasions/resolve";
import { previewCampaignSchedule } from "@/lib/campaigns/occasions/schedule-preview";

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Phase 4 US holiday calendar math", () => {
  it("UNIT_PASS: Thanksgiving is 4th Thursday in November", () => {
    expect(nthWeekdayOfMonth(2024, 11, 4, 4)).toBe("2024-11-28");
    expect(nthWeekdayOfMonth(2025, 11, 4, 4)).toBe("2025-11-27");
    expect(nthWeekdayOfMonth(2026, 11, 4, 4)).toBe("2026-11-26");
  });

  it("UNIT_PASS: Labor Day is first Monday in September", () => {
    expect(nthWeekdayOfMonth(2024, 9, 1, 1)).toBe("2024-09-02");
    expect(nthWeekdayOfMonth(2025, 9, 1, 1)).toBe("2025-09-01");
  });

  it("UNIT_PASS: Memorial Day is last Monday in May", () => {
    expect(lastWeekdayOfMonth(2024, 5, 1)).toBe("2024-05-27");
    expect(lastWeekdayOfMonth(2025, 5, 1)).toBe("2025-05-26");
  });

  it("UNIT_PASS: Mother's Day is 2nd Sunday in May", () => {
    expect(nthWeekdayOfMonth(2025, 5, 0, 2)).toBe("2025-05-11");
  });

  it("UNIT_PASS: federal observed shifts weekend holidays", () => {
    expect(federalObservedDate(2026, 7, 4)).toBe("2026-07-03");
    expect(federalObservedDate(2021, 7, 4)).toBe("2021-07-05");
    expect(federalObservedDate(2025, 7, 4)).toBe("2025-07-04");
  });

  it("UNIT_PASS: leap-day birthday uses Feb 28 in non-leap years", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(anniversaryInYear("2000-02-29", 2024)).toBe("2024-02-29");
    expect(anniversaryInYear("2000-02-29", 2025)).toBe("2025-02-28");
  });
});

describe("Phase 4 occurrence resolver", () => {
  it("UNIT_PASS: birthday occurrences across multi-year window", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("birthday")!,
      customerId: "c1",
      milestones: [
        {
          customerId: "c1",
          milestoneType: "birthday",
          anchorDate: "1990-03-15",
        },
      ],
      startDate: "2025-01-01",
      endDate: "2026-12-31",
      timezone: "America/New_York",
    });
    expect(result.occurrences.map((o) => o.occasionDate)).toEqual([
      "2025-03-15",
      "2026-03-15",
    ]);
    expect(result.skipped).toHaveLength(0);
  });

  it("UNIT_PASS: missing birthday does not invent data", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("birthday")!,
      customerId: "c1",
      milestones: [],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.occurrences).toHaveLength(0);
    expect(result.skipped[0]?.reason).toBe("missing_birthday");
  });

  it("UNIT_PASS: missing closing date skips closing anniversary", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("closing-anniversary")!,
      customerId: "c1",
      milestones: [],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.skipped[0]?.reason).toBe("missing_closing_date");
  });

  it("UNIT_PASS: inclusive campaign boundaries", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-christmas")!,
      customerId: "c1",
      milestones: [],
      startDate: "2025-12-25",
      endDate: "2025-12-25",
    });
    expect(result.occurrences).toHaveLength(1);
    expect(result.occurrences[0]?.occasionDate).toBe("2025-12-25");
  });

  it("UNIT_PASS: occasion after end date is excluded", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-christmas")!,
      customerId: "c1",
      milestones: [],
      startDate: "2025-01-01",
      endDate: "2025-12-24",
    });
    expect(result.occurrences).toHaveLength(0);
  });

  it("UNIT_PASS: Thanksgiving movable holiday inside window", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-thanksgiving")!,
      customerId: "c1",
      milestones: [],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.occurrences[0]?.occasionDate).toBe("2025-11-27");
  });

  it("UNIT_PASS: observed Independence Day differs from actual", () => {
    const actual = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-independence-day")!,
      customerId: "c1",
      milestones: [],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    const observed = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-independence-day-observed")!,
      customerId: "c1",
      milestones: [],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(actual.occurrences[0]?.occasionDate).toBe("2026-07-04");
    expect(observed.occurrences[0]?.occasionDate).toBe("2026-07-03");
    expect(observed.occurrences[0]?.dateRole).toBe("observed");
  });

  it("UNIT_PASS: custom one-time event only when inside window", () => {
    const occasion = {
      slug: "custom-open-house",
      name: "Open House",
      kind: "custom" as const,
      category: "custom" as const,
      rule: { type: "custom_once" as const, date: "2025-08-20" },
      defaultLeadDays: 5,
    };
    const inside = resolveOccasionOccurrences({
      occasion,
      customerId: "c1",
      milestones: [],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    const outside = resolveOccasionOccurrences({
      occasion,
      customerId: "c1",
      milestones: [],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(inside.occurrences).toHaveLength(1);
    expect(outside.skipped[0]?.reason).toBe("outside_window");
  });

  it("UNIT_PASS: multiple property milestones produce multiple anniversaries", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("home-anniversary")!,
      customerId: "c1",
      milestones: [
        {
          id: "m1",
          customerId: "c1",
          milestoneType: "home_anniversary",
          anchorDate: "2018-04-10",
          propertyType: "Condo",
        },
        {
          id: "m2",
          customerId: "c1",
          milestoneType: "home_anniversary",
          anchorDate: "2021-09-01",
          propertyType: "Single family",
        },
      ],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.occurrences).toHaveLength(2);
    expect(result.occurrences.map((o) => o.occasionDate).sort()).toEqual([
      "2025-04-10",
      "2025-09-01",
    ]);
  });
});

describe("Phase 4 schedule preview", () => {
  it("UNIT_PASS: returns upcoming, skips, eligible customers, expected card count", () => {
    const preview = previewCampaignSchedule({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      timezone: "America/New_York",
      customers: [
        {
          id: "c1",
          firstName: "Alex",
          lastName: "Rivera",
          milestones: [
            {
              customerId: "c1",
              milestoneType: "birthday",
              anchorDate: "1990-06-01",
            },
          ],
        },
        {
          id: "c2",
          firstName: "No",
          lastName: "Birthday",
          milestones: [],
        },
      ],
      occasions: [
        getOccasionBySlug("birthday")!,
        getOccasionBySlug("us-thanksgiving")!,
      ],
    });

    expect(preview.expectedCardCount).toBe(3);
    expect(preview.eligibleCustomerIds.sort()).toEqual(["c1", "c2"]);
    expect(preview.skipped.some((s) => s.reason === "missing_birthday")).toBe(
      true
    );
    expect(preview.upcomingOccasions.every((o) => o.occasionDate <= "2025-12-31")).toBe(
      true
    );
  });

  it("UNIT_PASS: defaults are selective (not every occasion)", () => {
    const defaults = getDefaultSelectedOccasions();
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults.length).toBeLessThan(US_OCCASION_CATALOG.length);
    expect(defaults.every((d) => d.isDefaultSelected)).toBe(true);
    expect(
      defaults.find((d) => d.slug === "us-valentines-day")
    ).toBeUndefined();
  });
});

describe("Phase 4 deliverables / no-send contracts", () => {
  it("CODE_REVIEW_PASS: migration 027 present and additive", () => {
    const names = readdirSync(resolve(process.cwd(), "supabase/migrations"));
    expect(names.some((f) => f.startsWith("027_"))).toBe(true);
    const sql = readRepo(
      "supabase/migrations/027_occasion_catalog_categories.sql"
    );
    expect(sql).toMatch(/Does not delete custom occasions/i);
    expect(sql).toContain("us-independence-day-observed");
    expect(sql).toContain("personal_milestone");
    expect(sql).toContain("real_estate_milestone");
  });

  it("CODE_REVIEW_PASS: schedule preview does not mail", () => {
    const src = readRepo("app/api/campaigns/schedule-preview/route.ts");
    expect(src).toContain("previewCampaignSchedule");
    expect(src).toContain("mailingSubmitted: false");
    expect(src).toContain("cardsScheduled: false");
    expect(src).not.toContain("getMailProvider");
    expect(src).not.toContain('.from("campaign_mailings")');
  });
});
