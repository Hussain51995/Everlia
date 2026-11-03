import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { activateCampaign } from "@/lib/campaigns/lifecycle";

type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const result = await activateCampaign({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      campaignId: params.id,
    });

    return apiSuccess({
      campaign: result.campaign,
      schedule: result.schedule,
      mailingSubmitted: false,
      note: "Campaign scheduling is active. No physical mail was submitted.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to activate campaign";
    const status =
      message.toLowerCase().includes("only organization") ||
      message.toLowerCase().includes("forbidden")
        ? 403
        : 400;
    return apiError({ code: "ACTIVATE_ERROR", message }, status);
  }
}
