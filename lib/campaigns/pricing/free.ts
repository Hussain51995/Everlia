import { isCampaignLiveMailEnabled } from "@/lib/mail/mode-guard";
import type {
  AuthorizeMailingInput,
  AuthorizeMailingResult,
  PricingQuote,
  PricingQuoteInput,
  PricingService,
} from "@/lib/campaigns/pricing/types";

export class FreePricingService implements PricingService {
  readonly name = "free";

  async quote(input: PricingQuoteInput): Promise<PricingQuote> {
    const currency = (input.currency ?? "USD").toUpperCase();
    const liveEnabled = isCampaignLiveMailEnabled();
    const isLive = input.mailingMode === "live";
    return {
      productMode: "free",
      billingMode: "waived",
      billingState: "waived",
      currency,
      unitPostageCents: 0,
      unitPlatformCents: 0,
      estimatedCardCount: input.estimatedCardCount,
      estimatedTotalCents: 0,
      spendingLimitCents: input.spendingLimitCents ?? null,
      availableBudgetCents: null,
      committedSpendCents: 0,
      displayLabel: isLive && liveEnabled
        ? "Live mailing enabled — platform charges waived"
        : "Free Testing Mode — No platform charges",
      freeTestingBanner:
        isLive && liveEnabled
          ? null
          : "Free Testing Mode — No platform charges",
      physicalMailDisclaimer:
        isLive && liveEnabled
          ? "Live physical mailing is enabled. Real PostGrid live postage may be incurred."
          : input.mailingMode === "test" || input.mailingMode === "dry_run"
            ? "Physical postcards are not sent in test mode. Artwork and sandbox provider records may be created, but no live postage is incurred."
            : "Live physical mailing is disabled unless separately approved and configured.",
      chargesEnabled: false,
    };
  }

  async authorizeMailing(
    input: AuthorizeMailingInput
  ): Promise<AuthorizeMailingResult> {
    if (input.mailingMode === "live" && !isCampaignLiveMailEnabled()) {
      return {
        allowed: false,
        reason: "live_disabled",
        message:
          "Live mailing is disabled. Set CAMPAIGN_LIVE_MAIL_ENABLED=true and POSTGRID_MODE=live.",
      };
    }

    return {
      allowed: true,
      authorizationId: `waived:${input.mailingId}`,
      amountCents: 0,
      currency: (input.currency ?? "USD").toUpperCase(),
      billingMode: "waived",
      duplicatePrevented: false,
    };
  }
}
