import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import type { CampaignMailing } from "@/lib/types/campaigns";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const scope = url.searchParams.get("scope"); 

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

    let query = supabase
      .from("campaign_mailings")
      .select(
        `
        *,
        customer:customers!customer_id (
          id, first_name, last_name
        ),
        greeting_card:greeting_cards!greeting_card_id (
          id,
          status,
          front_artwork_url,
          back_artwork_url
        ),
        campaign_occasion:campaign_occasions!campaign_occasion_id (
          id,
          message_template,
          occasion:occasions ( slug, name )
        )
      `
      )
      .eq("campaign_id", params.id)
      .eq("organization_id", ctx.organizationId)
      .order("send_on", { ascending: true })
      .limit(500);

    if (status) {
      query = query.eq("status", status);
    } else if (scope === "upcoming") {
      query = query.in("status", ["planned", "queued", "generating", "ready"]);
    } else if (scope === "history") {
      query = query.in("status", [
        "submitted",
        "failed",
        "cancelled",
        "skipped_past",
        "skipped_paused",
        "skipped_window",
        "skipped_cancelled",
      ]);
    }

    const { data, error } = await query;
    if (error) {
      return apiError({ code: "MAILINGS_ERROR", message: error.message }, 500);
    }

    return apiSuccess({ mailings: (data ?? []) as CampaignMailing[] });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load mailings",
      },
      500
    );
  }
}
