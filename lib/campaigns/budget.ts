import { getPricingService } from "@/lib/campaigns/pricing";
import type { AuthorizeMailingResult } from "@/lib/campaigns/pricing";
import { recordUsageEvent } from "@/lib/campaigns/usage";
import type { CampaignMailingMode } from "@/lib/types/campaigns";

export async function authorizeCampaignMailingSpend(params: {
  organizationId: string;
  campaignId: string;
  mailingId: string;
  mailingMode: CampaignMailingMode;
  currency?: string;
}): Promise<AuthorizeMailingResult> {
  const pricing = getPricingService();
  const result = await pricing.authorizeMailing({
    organizationId: params.organizationId,
    campaignId: params.campaignId,
    mailingId: params.mailingId,
    mailingMode: params.mailingMode,
    currency: params.currency,
  });

  const idempotencyKey = `budget:${params.mailingId}:${result.allowed ? "ok" : "deny"}`;

  if (result.allowed) {
    const recorded = await recordUsageEvent({
      organizationId: params.organizationId,
      campaignId: params.campaignId,
      mailingId: params.mailingId,
      eventType: "budget_authorized",
      amountCents: result.amountCents,
      currency: result.currency,
      billingMode: result.billingMode,
      mailingMode: params.mailingMode,
      idempotencyKey,
      payload: {
        authorizationId: result.authorizationId,
        duplicatePrevented: result.duplicatePrevented,
      },
    });

    if (recorded.duplicate) {
      return {
        ...result,
        duplicatePrevented: true,
      };
    }
    return result;
  }

  await recordUsageEvent({
    organizationId: params.organizationId,
    campaignId: params.campaignId,
    mailingId: params.mailingId,
    eventType: "budget_denied",
    amountCents: 0,
    mailingMode: params.mailingMode,
    idempotencyKey,
    payload: { reason: result.reason, message: result.message },
  });

  return result;
}
