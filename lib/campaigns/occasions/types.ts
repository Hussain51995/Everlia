export type OccasionCategory =
  | "federal_holiday"
  | "popular_greeting"
  | "real_estate_milestone"
  | "personal_milestone"
  | "custom";

export type OccasionKind =
  | "fixed_calendar"
  | "relative_calendar"
  | "customer_milestone"
  | "custom";

export type MilestoneType =
  | "birthday"
  | "home_anniversary"
  | "closing_anniversary"
  | "custom";

export type CivilDate = string;

export type OccasionRule =
  | {
      type: "fixed_md";
      month: number;
      day: number;
      observe?: "federal" | "none";
      dateRole?: "actual" | "observed";
    }
  | {
      type: "nth_weekday";
      month: number;
      weekday: number;
      n: number;
    }
  | {
      type: "last_weekday";
      month: number;
      weekday: number;
    }
  | {
      type: "milestone_annual";
      milestone_type: MilestoneType;
    }
  | {
      type: "custom_once";
      date: CivilDate;
    };

export type OccasionDefinition = {
  id?: string;
  slug: string;
  name: string;
  kind: OccasionKind;
  category: OccasionCategory;
  countryCode?: string;
  rule: OccasionRule;
  defaultLeadDays?: number;
  isActive?: boolean;
  isDefaultSelected?: boolean;
  sortOrder?: number;
};

export type CustomerMilestoneInput = {
  id?: string;
  customerId: string;
  milestoneType: MilestoneType;
  anchorDate: CivilDate;
  label?: string | null;
  propertyType?: string | null;
  recursAnnually?: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

export type OccurrenceSkipReason =
  | "missing_birthday"
  | "missing_closing_date"
  | "missing_home_anniversary"
  | "missing_milestone"
  | "outside_window"
  | "customer_excluded"
  | "occasion_disabled"
  | "inactive_milestone"
  | "invalid_rule"
  | "non_recurring_exhausted";

export type OccasionOccurrence = {
  occasionSlug: string;
  occasionName: string;
  occasionCategory: OccasionCategory;
  customerId: string;
  milestoneId?: string;
  occasionDate: CivilDate;
  sendOn: CivilDate;
  leadDays: number;
  dateRole: "actual" | "observed";
  source: "calendar" | "milestone" | "custom";
};

export type SkippedOccurrence = {
  occasionSlug: string;
  occasionName: string;
  customerId?: string;
  reason: OccurrenceSkipReason;
  detail?: string;
};

export type ResolveOccurrencesInput = {
  occasion: OccasionDefinition;
  customerId: string;
  milestones: CustomerMilestoneInput[];
  startDate: CivilDate;
  endDate: CivilDate;
  timezone?: string;
  leadDays?: number;
  excludedCustomerIds?: string[];
};

export type ResolveOccurrencesResult = {
  occurrences: OccasionOccurrence[];
  skipped: SkippedOccurrence[];
};
