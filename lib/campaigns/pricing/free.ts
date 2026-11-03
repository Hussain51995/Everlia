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
      displayLabel: "Free Testing Mode — No platform charges",
      freeTestingBanner: "Free Testing Mode — No platform charges",
      physicalMailDisclaimer:
        input.mailingMode === "test" || input.mailingMode === "dry_run"
          ? "Physical postcards are not sent in test mode. Artwork and sandbox provider records may be created, but no live postage is incurred."
          : "Live physical mailing is disabled unless separately approved and configured.",
      chargesEnabled: false,
    };
  }

  async authorizeMailing(
    input: AuthorizeMailingInput
  ): Promise<AuthorizeMailingResult> {
    if (input.mailingMode === "live") {
      return {
        allowed: false,
        reason: "live_disabled",
        message:
          "Live mailing is disabled. Free testing mode cannot authorize live postage.",
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
