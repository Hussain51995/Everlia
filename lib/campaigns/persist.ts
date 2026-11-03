import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CampaignCreateInput,
  CampaignOccasionConfigInput,
  CampaignUpdateInput,
} from "@/lib/validations/campaigns";

type AnySupabase = SupabaseClient;

async function resolveOccasionId(
  supabase: AnySupabase,
  config: CampaignOccasionConfigInput
): Promise<string | null> {
  if (config.occasionId) return config.occasionId;
  if (!config.occasionSlug) return null;

  const { data, error } = await supabase
    .from("occasions")
    .select("id")
    .eq("slug", config.occasionSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function replaceCampaignCustomers(params: {
  supabase: AnySupabase;
  organizationId: string;
  campaignId: string;
  customerIds: string[];
}): Promise<void> {
  const { supabase, organizationId, campaignId, customerIds } = params;

  const { data: existing, error: existingError } = await supabase
    .from("campaign_customers")
    .select("id, customer_id, status")
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId);

  if (existingError) throw new Error(existingError.message);

  const desired = new Set(customerIds);
  const now = new Date().toISOString();

  for (const row of existing ?? []) {
    if (!desired.has(row.customer_id) && row.status === "enrolled") {
      const { error } = await supabase
        .from("campaign_customers")
        .update({ status: "removed", removed_at: now })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }

  for (const customerId of customerIds) {
    const prior = (existing ?? []).find((r) => r.customer_id === customerId);
    if (prior?.status === "enrolled") continue;

    if (prior) {
      const { error } = await supabase
        .from("campaign_customers")
        .update({ status: "enrolled", removed_at: null, enrolled_at: now })
        .eq("id", prior.id);
      if (error) throw new Error(error.message);
      continue;
    }

    const { error } = await supabase.from("campaign_customers").insert({
      campaign_id: campaignId,
      organization_id: organizationId,
      customer_id: customerId,
      status: "enrolled",
    });
    if (error) throw new Error(error.message);
  }
}

export async function replaceCampaignOccasions(params: {
  supabase: AnySupabase;
  organizationId: string;
  campaignId: string;
  occasions: CampaignOccasionConfigInput[];
}): Promise<void> {
  const { supabase, organizationId, campaignId, occasions } = params;

  const { error: deleteError } = await supabase
    .from("campaign_occasions")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId);

  if (deleteError) throw new Error(deleteError.message);

  for (const config of occasions) {
    const occasionId = await resolveOccasionId(supabase, config);
    const { data: inserted, error } = await supabase
      .from("campaign_occasions")
      .insert({
        campaign_id: campaignId,
        organization_id: organizationId,
        occasion_id: occasionId,
        custom_name: config.customName ?? null,
        occurrence_date: config.occurrenceDate ?? null,
        lead_days: config.leadDays ?? null,
        message_template: config.messageTemplate ?? null,
        is_enabled: config.isEnabled ?? true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const excluded = config.excludedCustomerIds ?? [];
    if (excluded.length > 0 && inserted?.id) {
      const { error: exError } = await supabase
        .from("campaign_occasion_exclusions")
        .insert(
          excluded.map((customerId) => ({
            campaign_occasion_id: inserted.id,
            organization_id: organizationId,
            customer_id: customerId,
          }))
        );
      if (exError) throw new Error(exError.message);
    }
  }
}

export async function ensureBillingStub(params: {
  supabase: AnySupabase;
  organizationId: string;
  campaignId: string;
}): Promise<void> {
  const { quoteCampaignUsage, refreshCampaignUsageProfile } = await import(
    "@/lib/campaigns/usage"
  );
  const quote = await quoteCampaignUsage({
    organizationId: params.organizationId,
    campaignId: params.campaignId,
    estimatedCardCount: 0,
    enrolledCustomerCount: 0,
    mailingMode: "test",
  });
  await refreshCampaignUsageProfile({
    organizationId: params.organizationId,
    campaignId: params.campaignId,
    quote,
  });
}

export function campaignPatchFromUpdate(
  input: CampaignUpdateInput | CampaignCreateInput
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if ("name" in input && input.name !== undefined) patch.name = input.name;
  if ("defaultTemplateId" in input && input.defaultTemplateId !== undefined) {
    patch.default_template_id = input.defaultTemplateId;
  }
  if ("startDate" in input && input.startDate !== undefined) {
    patch.start_date = input.startDate;
  }
  if ("endDate" in input && input.endDate !== undefined) {
    patch.end_date = input.endDate;
  }
  if ("timezone" in input && input.timezone !== undefined) {
    patch.timezone = input.timezone;
  }
  if ("mailingMode" in input && input.mailingMode !== undefined) {
    patch.mailing_mode = input.mailingMode;
  }
  if ("configuration" in input && input.configuration !== undefined) {
    patch.configuration = input.configuration;
  }
  if ("fieldValueDefaults" in input && input.fieldValueDefaults !== undefined) {
    patch.field_value_defaults = input.fieldValueDefaults;
  }
  return patch;
}
