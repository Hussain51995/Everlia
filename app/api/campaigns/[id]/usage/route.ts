import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { refreshCampaignUsageProfile } from "@/lib/campaigns/usage";
import type { CampaignUsageEvent } from "@/lib/types/campaigns";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (!campaign) {
      return apiError({ code: "NOT_FOUND", message: "Campaign not found" }, 404);
    }

    const snapshot = await refreshCampaignUsageProfile({
      organizationId: ctx.organizationId,
      campaignId: params.id,
    });

    const [{ data: billing }, { data: events }] = await Promise.all([
      supabase
        .from("campaign_billing_profiles")
        .select("*")
        .eq("campaign_id", params.id)
        .maybeSingle(),
      supabase
        .from("campaign_usage_events")
        .select("*")
        .eq("campaign_id", params.id)
        .eq("organization_id", ctx.organizationId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return apiSuccess({
      usage: snapshot,
      billing,
      events: (events ?? []) as CampaignUsageEvent[],
      freeTesting: true,
      banner: "Free Testing Mode — No platform charges",
      physicalMailDisclaimer:
        "Physical postcards are not sent in test mode.",
    });
  } catch (error) {
    return apiError(
      {
        code: "USAGE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load usage",
      },
      500
    );
  }
}
