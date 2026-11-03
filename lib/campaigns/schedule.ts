import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeCampaignAuditEvent } from "@/lib/campaigns/audit";
import { todayInTimezone } from "@/lib/campaigns/civil-today";
import {
  adjustSendOnForPostalCalendar,
  computeArtworkPrepareOn,
} from "@/lib/campaigns/postal-calendar";
import {
  addDays,
  compareCivil,
  occasionFromDbRow,
  previewCampaignSchedule,
  type CustomerMilestoneInput,
  type OccasionDefinition,
} from "@/lib/campaigns/occasions";
import type { CampaignOccasion } from "@/lib/types/campaigns";

export const DEFAULT_SCHEDULING_HORIZON_DAYS = 90;

type SupabaseLike = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export function mailingIdempotencyKey(params: {
  campaignId: string;
  customerId: string;
  campaignOccasionId: string;
  occasionDate: string;
}): string {
  return `${params.campaignId}:${params.customerId}:${params.campaignOccasionId}:${params.occasionDate}`;
}

function occasionDefinitionFromRow(
  row: CampaignOccasion & {
    occasion?: {
      id: string;
      slug: string;
      name: string;
      category: string;
      kind: string;
      rule: Record<string, unknown>;
      default_lead_days: number | null;
    } | null;
  }
): OccasionDefinition | null {
  if (row.occasion) {
    const def = occasionFromDbRow({
      id: row.occasion.id,
      slug: row.occasion.slug,
      name: row.occasion.name,
      kind: row.occasion.kind,
      category: row.occasion.category,
      rule: row.occasion.rule,
      default_lead_days: row.occasion.default_lead_days,
      is_active: true,
      is_default_selected: false,
      sort_order: 0,
    });
    if (row.lead_days != null) {
      def.defaultLeadDays = row.lead_days;
    }
    return def;
  }

  if (row.occurrence_date) {
    return {
      slug: `custom-${row.id}`,
      name: row.custom_name?.trim() || "Custom occasion",
      kind: "custom",
      category: "custom",
      rule: { type: "custom_once", date: row.occurrence_date },
      defaultLeadDays: row.lead_days ?? 7,
      isDefaultSelected: false,
    };
  }

  if (row.custom_name && row.recurrence_rule) {
    return {
      slug: `custom-${row.id}`,
      name: row.custom_name,
      kind: "custom",
      category: "custom",
      rule: row.recurrence_rule as OccasionDefinition["rule"],
      defaultLeadDays: row.lead_days ?? 7,
      isDefaultSelected: false,
    };
  }

  return null;
}

export async function generateDurableSchedule(params: {
  supabase: SupabaseLike;
  organizationId: string;
  campaignId: string;
  actorUserId: string;
  replaceFuturePlanned?: boolean;
}): Promise<{
  plannedCount: number;
  skippedPastCount: number;
  skippedWindowCount: number;
  expectedCardCount: number;
}> {
  const { supabase, organizationId, campaignId, actorUserId } = params;

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "Campaign not found");
  }

  const { data: enrollments, error: enrollError } = await supabase
    .from("campaign_customers")
    .select("id, customer_id, status")
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId)
    .eq("status", "enrolled");

  if (enrollError) throw new Error(enrollError.message);

  const enrolled = enrollments ?? [];
  if (enrolled.length === 0) {
    throw new Error("Enroll at least one customer before scheduling");
  }

  const { data: occasionRows, error: occasionError } = await supabase
    .from("campaign_occasions")
    .select(
      `
      *,
      occasion:occasions (
        id, slug, name, category, kind, rule, default_lead_days
      ),
      exclusions:campaign_occasion_exclusions ( customer_id )
    `
    )
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId)
    .eq("is_enabled", true);

  if (occasionError) throw new Error(occasionError.message);

  const occasions = (occasionRows ?? []) as Array<
    CampaignOccasion & {
      occasion?: CampaignOccasion["occasion"];
      exclusions?: { customer_id: string }[];
    }
  >;

  if (occasions.length === 0) {
    throw new Error("Enable at least one occasion before scheduling");
  }

  const customerIds = enrolled.map((e) => e.customer_id);
  const { data: milestoneRows, error: milestoneError } = await supabase
    .from("customer_milestones")
    .select("*")
    .eq("organization_id", organizationId)
    .in("customer_id", customerIds)
    .eq("is_active", true);

  if (milestoneError) throw new Error(milestoneError.message);

  const milestonesByCustomer = new Map<string, CustomerMilestoneInput[]>();
  for (const row of milestoneRows ?? []) {
    const list = milestonesByCustomer.get(row.customer_id) ?? [];
    list.push({
      id: row.id,
      customerId: row.customer_id,
      milestoneType: row.milestone_type,
      anchorDate: row.anchor_date,
      label: row.label,
      propertyType: row.property_type,
      recursAnnually: row.recurs_annually,
      isActive: row.is_active,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    });
    milestonesByCustomer.set(row.customer_id, list);
  }

  const enrollmentByCustomer = new Map(
    enrolled.map((e) => [e.customer_id, e.id] as const)
  );

  const occasionDefs: Array<{
    row: (typeof occasions)[number];
    def: OccasionDefinition;
  }> = [];

  for (const row of occasions) {
    const def = occasionDefinitionFromRow(row);
    if (def) occasionDefs.push({ row, def });
  }

  const leadDaysBySlug: Record<string, number> = {};
  const exclusionsBySlug: Record<string, string[]> = {};
  for (const { row, def } of occasionDefs) {
    if (row.lead_days != null) leadDaysBySlug[def.slug] = row.lead_days;
    exclusionsBySlug[def.slug] = (row.exclusions ?? []).map((e) => e.customer_id);
  }

  const config = (campaign.configuration ?? {}) as Record<string, unknown>;
  const horizonDays =
    typeof config.schedulingHorizonDays === "number" &&
    config.schedulingHorizonDays > 0
      ? Math.min(config.schedulingHorizonDays, 366)
      : DEFAULT_SCHEDULING_HORIZON_DAYS;

  const today = todayInTimezone(campaign.timezone);
  const horizonEndCandidate = addDays(today, horizonDays) ?? campaign.end_date;
  const scheduleEnd =
    compareCivil(horizonEndCandidate, campaign.end_date) < 0
      ? horizonEndCandidate
      : campaign.end_date;

  const preview = previewCampaignSchedule({
    startDate: campaign.start_date,
    endDate: scheduleEnd,
    timezone: campaign.timezone,
    customers: customerIds.map((id) => ({
      id,
      firstName: "",
      lastName: "",
      milestones: milestonesByCustomer.get(id) ?? [],
    })),
    occasions: occasionDefs.map((o) => o.def),
    leadDaysByOccasionSlug: leadDaysBySlug,
    exclusionsByOccasionSlug: exclusionsBySlug,
  });

  const slugToOccasionRow = new Map(
    occasionDefs.map((o) => [o.def.slug, o.row] as const)
  );

  if (params.replaceFuturePlanned) {
    await supabase
      .from("campaign_mailings")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("organization_id", organizationId)
      .eq("status", "planned")
      .gte("send_on", today);
  }

  let plannedCount = 0;
  let skippedPastCount = 0;
  let skippedWindowCount = 0;

  const rows: Array<Record<string, unknown>> = [];

  for (const occ of preview.upcomingOccasions) {
    const occasionRow = slugToOccasionRow.get(occ.occasionSlug);
    const enrollmentId = enrollmentByCustomer.get(occ.customerId);
    if (!occasionRow || !enrollmentId) continue;

    const templateId =
      occasionRow.template_id ?? campaign.default_template_id;

    const adjustedSendOn = adjustSendOnForPostalCalendar(occ.sendOn);
    const artworkPrepareOn = computeArtworkPrepareOn(adjustedSendOn, 2);

    let status: string = "planned";
    let skipReason: string | null = null;

    if (
      compareCivil(occ.occasionDate, campaign.end_date) > 0 ||
      compareCivil(adjustedSendOn, campaign.end_date) > 0
    ) {
      status = "skipped_window";
      skipReason = "occasion/send_on after campaign end_date";
      skippedWindowCount += 1;
    } else if (compareCivil(adjustedSendOn, today) < 0) {
      status = "skipped_past";
      skipReason =
        "planned submission date already passed at schedule time (no late send)";
      skippedPastCount += 1;
    } else {
      plannedCount += 1;
    }

    rows.push({
      campaign_id: campaignId,
      organization_id: organizationId,
      campaign_customer_id: enrollmentId,
      customer_id: occ.customerId,
      campaign_occasion_id: occasionRow.id,
      occasion_date: occ.occasionDate,
      send_on: adjustedSendOn,
      artwork_prepare_on: artworkPrepareOn,
      template_id: templateId,
      status,
      skip_reason: skipReason,
      field_values: {
        _schedule: {
          rawSendOn: occ.sendOn,
          adjustedSendOn,
          artworkPrepareOn,
          leadDays: occ.leadDays,
          note: "Occasion date is not a guaranteed delivery date",
        },
      },
      idempotency_key: mailingIdempotencyKey({
        campaignId,
        customerId: occ.customerId,
        campaignOccasionId: occasionRow.id,
        occasionDate: occ.occasionDate,
      }),
    });
  }

  if (rows.length > 0) {
    const { data: existingLocked } = await supabase
      .from("campaign_mailings")
      .select("idempotency_key, status")
      .eq("campaign_id", campaignId)
      .in("status", [
        "queued",
        "generating",
        "ready",
        "submitting",
        "submitted",
        "failed",
      ]);

    const locked = new Set(
      (existingLocked ?? []).map((r) => r.idempotency_key as string)
    );
    const safeRows = rows.filter(
      (r) => !locked.has(r.idempotency_key as string)
    );

    if (safeRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("campaign_mailings")
        .upsert(safeRows, {
          onConflict: "idempotency_key",
          ignoreDuplicates: false,
        });

      if (upsertError) throw new Error(upsertError.message);
    }
  }

  const { recordUsageEvent, refreshCampaignUsageProfile, quoteCampaignUsage } =
    await import("@/lib/campaigns/usage");

  const enrolledCount = enrolled.length;
  const quote = await quoteCampaignUsage({
    organizationId,
    campaignId,
    estimatedCardCount: plannedCount,
    enrolledCustomerCount: enrolledCount,
    mailingMode: campaign.mailing_mode,
  });

  await refreshCampaignUsageProfile({
    organizationId,
    campaignId,
    quote,
  });

  await recordUsageEvent({
    organizationId,
    campaignId,
    eventType: "cards_scheduled",
    quantity: plannedCount,
    amountCents: quote.estimatedTotalCents,
    currency: quote.currency,
    billingMode: quote.billingMode,
    mailingMode: campaign.mailing_mode,
    idempotencyKey: `schedule:${campaignId}:${campaign.start_date}:${campaign.end_date}:${plannedCount}`,
    payload: {
      skippedPastCount,
      skippedWindowCount,
      horizonEnd: scheduleEnd,
    },
  });

  await recordUsageEvent({
    organizationId,
    campaignId,
    eventType: "customers_enrolled",
    quantity: enrolledCount,
    billingMode: quote.billingMode,
    mailingMode: campaign.mailing_mode,
    idempotencyKey: `enrolled:${campaignId}:${enrolledCount}`,
    payload: {},
  });

  await writeCampaignAuditEvent({
    organizationId,
    campaignId,
    actorUserId,
    action: "schedule_generated",
    payload: {
      plannedCount,
      skippedPastCount,
      skippedWindowCount,
      expectedCardCount: plannedCount,
      mailingMode: campaign.mailing_mode,
      billingMode: quote.billingMode,
      estimatedTotalCents: quote.estimatedTotalCents,
    },
  });

  return {
    plannedCount,
    skippedPastCount,
    skippedWindowCount,
    expectedCardCount: plannedCount,
  };
}
