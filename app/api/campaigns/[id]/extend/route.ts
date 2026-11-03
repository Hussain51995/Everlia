import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { extendCampaign } from "@/lib/campaigns/lifecycle";
import { campaignExtendSchema } from "@/lib/validations/campaigns";
import { firstZodError } from "@/lib/validations/errors";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = campaignExtendSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid extend request")
      );
    }

    const result = await extendCampaign(
      {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        campaignId: params.id,
      },
      parsed.data.endDate
    );

    return apiSuccess({
      campaign: result.campaign,
      schedule: result.schedule,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extend campaign";
    const status = message.toLowerCase().includes("only organization")
      ? 403
      : 400;
    return apiError({ code: "EXTEND_ERROR", message }, status);
  }
}
