import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import type { CampaignAuditEvent } from "@/lib/types/campaigns";

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

    const { data, error } = await supabase
      .from("campaign_audit_events")
      .select("*")
      .eq("campaign_id", params.id)
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return apiError({ code: "ACTIVITY_ERROR", message: error.message }, 500);
    }

    return apiSuccess({ events: (data ?? []) as CampaignAuditEvent[] });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load activity",
      },
      500
    );
  }
}
