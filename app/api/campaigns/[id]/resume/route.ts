import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { resumeCampaign } from "@/lib/campaigns/lifecycle";

type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const campaign = await resumeCampaign({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      campaignId: params.id,
    });

    return apiSuccess({ campaign });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resume campaign";
    const status = message.toLowerCase().includes("only organization")
      ? 403
      : 400;
    return apiError({ code: "RESUME_ERROR", message }, status);
  }
}
