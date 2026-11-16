

import type { OccasionDefinition } from "@/lib/campaigns/occasions/types";

export const US_OCCASION_CATALOG: OccasionDefinition[] = [
  {
    slug: "birthday",
    name: "Birthday",
    kind: "customer_milestone",
    category: "personal_milestone",
    countryCode: "US",
    rule: { type: "milestone_annual", milestone_type: "birthday" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 10,
  },

  {
    slug: "home-anniversary",
    name: "Home Anniversary",
    kind: "customer_milestone",
    category: "real_estate_milestone",
    countryCode: "US",
    rule: { type: "milestone_annual", milestone_type: "home_anniversary" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 20,
  },
  {
    slug: "closing-anniversary",
    name: "Closing Anniversary",
    kind: "customer_milestone",
    category: "real_estate_milestone",
    countryCode: "US",
    rule: { type: "milestone_annual", milestone_type: "closing_anniversary" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 30,
  },

  {
    slug: "us-valentines-day",
    name: "Valentine's Day",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 2, day: 14, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 110,
  },
  {
    slug: "us-st-patricks-day",
    name: "St. Patrick's Day",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 3, day: 17, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 120,
  },
  {
    slug: "us-mothers-day",
    name: "Mother's Day",
    kind: "relative_calendar",
    category: "popular_greeting",
    rule: { type: "nth_weekday", month: 5, weekday: 0, n: 2 },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 220,
  },
  {
    slug: "us-fathers-day",
    name: "Father's Day",
    kind: "relative_calendar",
    category: "popular_greeting",
    rule: { type: "nth_weekday", month: 6, weekday: 0, n: 3 },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 240,
  },
  {
    slug: "us-halloween",
    name: "Halloween",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 10, day: 31, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 140,
  },
  {
    slug: "us-christmas",
    name: "Christmas",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 12, day: 25, dateRole: "actual" },
    defaultLeadDays: 10,
    isDefaultSelected: true,
    sortOrder: 160,
  },
  {
    slug: "us-new-years-eve",
    name: "New Year's Eve",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 12, day: 31, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 170,
  },

  {
    slug: "us-new-years-day",
    name: "New Year's Day",
    kind: "fixed_calendar",
    category: "federal_holiday",
    rule: { type: "fixed_md", month: 1, day: 1, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 100,
  },
  {
    slug: "us-new-years-day-observed",
    name: "New Year's Day (Observed)",
    kind: "fixed_calendar",
    category: "federal_holiday",
    rule: {
      type: "fixed_md",
      month: 1,
      day: 1,
      observe: "federal",
      dateRole: "observed",
    },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    isActive: true,
    sortOrder: 101,
  },
  {
    slug: "us-martin-luther-king-jr-day",
    name: "Martin Luther King Jr. Day",
    kind: "relative_calendar",
    category: "federal_holiday",
    rule: { type: "nth_weekday", month: 1, weekday: 1, n: 3 },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 200,
  },
  {
    slug: "us-presidents-day",
    name: "Presidents' Day",
    kind: "relative_calendar",
    category: "federal_holiday",
    rule: { type: "nth_weekday", month: 2, weekday: 1, n: 3 },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 210,
  },
  {
    slug: "us-memorial-day",
    name: "Memorial Day",
    kind: "relative_calendar",
    category: "federal_holiday",
    rule: { type: "last_weekday", month: 5, weekday: 1 },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 230,
  },
  {
    slug: "us-independence-day",
    name: "Independence Day",
    kind: "fixed_calendar",
    category: "federal_holiday",
    rule: { type: "fixed_md", month: 7, day: 4, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 130,
  },
  {
    slug: "us-independence-day-observed",
    name: "Independence Day (Observed)",
    kind: "fixed_calendar",
    category: "federal_holiday",
    rule: {
      type: "fixed_md",
      month: 7,
      day: 4,
      observe: "federal",
      dateRole: "observed",
    },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 131,
  },
  {
    slug: "us-labor-day",
    name: "Labor Day",
    kind: "relative_calendar",
    category: "federal_holiday",
    rule: { type: "nth_weekday", month: 9, weekday: 1, n: 1 },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 250,
  },
  {
    slug: "us-columbus-day",
    name: "Columbus Day / Indigenous Peoples' Day",
    kind: "relative_calendar",
    category: "federal_holiday",
    rule: { type: "nth_weekday", month: 10, weekday: 1, n: 2 },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 260,
  },
  {
    slug: "us-veterans-day",
    name: "Veterans Day",
    kind: "fixed_calendar",
    category: "federal_holiday",
    rule: { type: "fixed_md", month: 11, day: 11, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 150,
  },
  {
    slug: "us-veterans-day-observed",
    name: "Veterans Day (Observed)",
    kind: "fixed_calendar",
    category: "federal_holiday",
    rule: {
      type: "fixed_md",
      month: 11,
      day: 11,
      observe: "federal",
      dateRole: "observed",
    },
    defaultLeadDays: 7,
    isDefaultSelected: false,
    sortOrder: 151,
  },
  {
    slug: "us-thanksgiving",
    name: "Thanksgiving",
    kind: "relative_calendar",
    category: "federal_holiday",
    rule: { type: "nth_weekday", month: 11, weekday: 4, n: 4 },
    defaultLeadDays: 10,
    isDefaultSelected: true,
    sortOrder: 270,
  },

  {
    slug: "referral-january",
    name: "Referral Card (January)",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 1, day: 1, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 102,
  },
  {
    slug: "referral-april",
    name: "Referral Card (April)",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 4, day: 1, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 125,
  },
  {
    slug: "referral-july",
    name: "Referral Card (July)",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 7, day: 1, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 128,
  },
  {
    slug: "referral-october",
    name: "Referral Card (October)",
    kind: "fixed_calendar",
    category: "popular_greeting",
    rule: { type: "fixed_md", month: 10, day: 1, dateRole: "actual" },
    defaultLeadDays: 7,
    isDefaultSelected: true,
    sortOrder: 135,
  },
];

export function getDefaultSelectedOccasions(): OccasionDefinition[] {
  return US_OCCASION_CATALOG.filter(
    (o) => o.isDefaultSelected && o.isActive !== false
  );
}

export function getOccasionBySlug(slug: string): OccasionDefinition | undefined {
  return US_OCCASION_CATALOG.find((o) => o.slug === slug);
}

export function occasionsByCategory(
  category: OccasionDefinition["category"]
): OccasionDefinition[] {
  return US_OCCASION_CATALOG.filter((o) => o.category === category);
}

export function occasionFromDbRow(row: {
  id?: string;
  slug: string;
  name: string;
  kind: string;
  category?: string | null;
  country_code?: string | null;
  rule: unknown;
  default_lead_days?: number | null;
  is_active?: boolean | null;
  is_default_selected?: boolean | null;
  sort_order?: number | null;
}): OccasionDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind as OccasionDefinition["kind"],
    category: (row.category as OccasionDefinition["category"]) || "custom",
    countryCode: row.country_code ?? "US",
    rule: row.rule as OccasionDefinition["rule"],
    defaultLeadDays: row.default_lead_days ?? 7,
    isActive: row.is_active ?? true,
    isDefaultSelected: row.is_default_selected ?? false,
    sortOrder: row.sort_order ?? 100,
  };
}
