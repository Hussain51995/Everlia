import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { quoteCampaignUsage } from "@/lib/campaigns/usage";
import { z } from "zod";
import { firstZodError } from "@/lib/validations/errors";

const quoteSchema = z.object({
  campaignId: z.string().uuid().optional(),
  estimatedCardCount: z.number().int().min(0).max(100_000),
  enrolledCustomerCount: z.number().int().min(0).max(100_000),
  mailingMode: z.enum(["dry_run", "test", "live"]).optional().default("test"),
  spendingLimitCents: z.number().int().min(0).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid quote request"));
    }

    const quote = await quoteCampaignUsage({
      organizationId: ctx.organizationId,
      campaignId: parsed.data.campaignId,
      estimatedCardCount: parsed.data.estimatedCardCount,
      enrolledCustomerCount: parsed.data.enrolledCustomerCount,
      mailingMode: parsed.data.mailingMode,
      spendingLimitCents: parsed.data.spendingLimitCents,
    });

    return apiSuccess({
      quote,
      chargesEnabled: false,
      note: "No payment provider is required. Everlia does not charge users in free testing mode.",
    });
  } catch (error) {
    return apiError(
      {
        code: "QUOTE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to build quote",
      },
      500
    );
  }
}
