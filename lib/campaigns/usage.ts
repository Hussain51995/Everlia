import { createAdminClient } from "@/lib/supabase/admin";
import { getPricingService } from "@/lib/campaigns/pricing";
import type { PricingQuote } from "@/lib/campaigns/pricing";
import type {
  CampaignBillingMode,
  CampaignMailingMode,
} from "@/lib/types/campaigns";

export type CampaignUsageEventType =
  | "customers_enrolled"
  | "cards_scheduled"
  | "artwork_generated"
  | "mailing_test_submitted"
  | "mailing_live_submitted"
  | "mailing_failed"
  | "mailing_skipped"
  | "quote_refresh"
  | "budget_authorized"
  | "budget_denied";

export type RecordUsageEventInput = {
  organizationId: string;
  campaignId: string;
  mailingId?: string | null;
  eventType: CampaignUsageEventType;
  quantity?: number;
  amountCents?: number;
  currency?: string;
  billingMode?: CampaignBillingMode;
  mailingMode?: CampaignMailingMode | null;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
};

export type CampaignUsageSnapshot = {
  enrolledCustomers: number;
  cardsScheduled: number;
  artworksGenerated: number;
  testMailings: number;
  liveMailings: number;
  failedMailings: number;
  skippedMailings: number;
  plannedMailings: number;
  submittedMailings: number;
};

export async function recordUsageEvent(
  input: RecordUsageEventInput
): Promise<{ recorded: boolean; duplicate: boolean }> {
  const admin = createAdminClient();
  const row = {
    organization_id: input.organizationId,
    campaign_id: input.campaignId,
    mailing_id: input.mailingId ?? null,
    event_type: input.eventType,
    quantity: input.quantity ?? 1,
    amount_cents: input.amountCents ?? 0,
    currency: (input.currency ?? "USD").toUpperCase(),
    billing_mode: input.billingMode ?? "waived",
    mailing_mode: input.mailingMode ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
  };

  const { error } = await admin.from("campaign_usage_events").insert(row);

  if (error) {
    if (
      error.code === "23505" ||
      error.message.toLowerCase().includes("duplicate")
    ) {
      return { recorded: false, duplicate: true };
    }
    throw new Error(error.message);
  }

  return { recorded: true, duplicate: false };
}

export async function refreshCampaignUsageProfile(params: {
  organizationId: string;
  campaignId: string;
  quote?: PricingQuote | null;
}): Promise<CampaignUsageSnapshot> {
  const admin = createAdminClient();

  const [
    { count: enrolled },
    { data: mailings },
  ] = await Promise.all([
    admin
      .from("campaign_customers")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", params.campaignId)
      .eq("status", "enrolled"),
    admin
      .from("campaign_mailings")
      .select("status, greeting_card_id")
      .eq("campaign_id", params.campaignId),
  ]);

  const rows = mailings ?? [];
  const snapshot: CampaignUsageSnapshot = {
    enrolledCustomers: enrolled ?? 0,
    cardsScheduled: rows.length,
    artworksGenerated: rows.filter((m) => m.greeting_card_id).length,
    testMailings: rows.filter((m) => m.status === "submitted").length,
    liveMailings: 0,
    failedMailings: rows.filter((m) => m.status === "failed").length,
    skippedMailings: rows.filter((m) =>
      String(m.status).startsWith("skipped_")
    ).length,
    plannedMailings: rows.filter((m) => m.status === "planned").length,
    submittedMailings: rows.filter((m) => m.status === "submitted").length,
  };

  const quote =
    params.quote ??
    (await getPricingService().quote({
      organizationId: params.organizationId,
      campaignId: params.campaignId,
      estimatedCardCount: snapshot.plannedMailings + snapshot.submittedMailings,
      enrolledCustomerCount: snapshot.enrolledCustomers,
      mailingMode: "test",
    }));

  const { error } = await admin.from("campaign_billing_profiles").upsert(
    {
      campaign_id: params.campaignId,
      organization_id: params.organizationId,
      billing_mode: quote.billingMode,
      billing_state: quote.billingState,
      currency: quote.currency,
      unit_postage_cents: quote.unitPostageCents,
      unit_platform_cents: quote.unitPlatformCents,
      spending_limit_cents: quote.spendingLimitCents,
      estimated_total_cents: quote.estimatedTotalCents,
      mailings_planned_count: snapshot.plannedMailings,
      mailings_submitted_count: snapshot.submittedMailings,
      mailings_failed_count: snapshot.failedMailings,
      enrolled_customers_count: snapshot.enrolledCustomers,
      artworks_generated_count: snapshot.artworksGenerated,
      test_mailings_count: snapshot.testMailings,
      live_mailings_count: snapshot.liveMailings,
      mailings_skipped_count: snapshot.skippedMailings,
      committed_spend_cents: quote.committedSpendCents,
      price_configuration: {
        productMode: quote.productMode,
        displayLabel: quote.displayLabel,
        chargesEnabled: quote.chargesEnabled,
        source: "pricing_service",
      },
    },
    { onConflict: "campaign_id" }
  );

  if (error) throw new Error(error.message);
  return snapshot;
}

export async function quoteCampaignUsage(params: {
  organizationId: string;
  campaignId?: string;
  estimatedCardCount: number;
  enrolledCustomerCount: number;
  mailingMode?: CampaignMailingMode;
  spendingLimitCents?: number | null;
}): Promise<PricingQuote> {
  return getPricingService().quote({
    organizationId: params.organizationId,
    campaignId: params.campaignId,
    estimatedCardCount: params.estimatedCardCount,
    enrolledCustomerCount: params.enrolledCustomerCount,
    mailingMode: params.mailingMode ?? "test",
    spendingLimitCents: params.spendingLimitCents,
  });
}
