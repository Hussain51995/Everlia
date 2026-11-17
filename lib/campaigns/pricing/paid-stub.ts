import { isCampaignLiveMailEnabled } from "@/lib/mail/mode-guard";
import type {
  AuthorizeMailingInput,
  AuthorizeMailingResult,
  PricingQuote,
  PricingQuoteInput,
  PricingService,
} from "@/lib/campaigns/pricing/types";

export class PaidPricingStubService implements PricingService {
  readonly name = "paid_stub";

  constructor(
    private readonly config: {
      unitPostageCents: number;
      unitPlatformCents: number;
      currency?: string;
      availableBudgetCents?: number | null;
      billingMode?: "usage" | "prepaid" | "invoice";
    }
  ) {}

  async quote(input: PricingQuoteInput): Promise<PricingQuote> {
    const currency = (
      input.currency ??
      this.config.currency ??
      "USD"
    ).toUpperCase();
    const unitPostage = this.config.unitPostageCents;
    const unitPlatform = this.config.unitPlatformCents;
    const estimatedTotalCents =
      input.estimatedCardCount * (unitPostage + unitPlatform);
    const spendingLimit = input.spendingLimitCents ?? null;
    const available =
      this.config.availableBudgetCents ??
      (spendingLimit != null ? spendingLimit : null);

    return {
      productMode: "paid",
      billingMode: this.config.billingMode ?? "usage",
      billingState: "pending",
      currency,
      unitPostageCents: unitPostage,
      unitPlatformCents: unitPlatform,
      estimatedCardCount: input.estimatedCardCount,
      estimatedTotalCents,
      spendingLimitCents: spendingLimit,
      availableBudgetCents: available,
      committedSpendCents: 0,
      displayLabel: "Paid mode (not enabled)",
      freeTestingBanner: null,
      physicalMailDisclaimer:
        "Paid live mailing requires separate approval, production PostGrid credentials, and a billing provider. Not enabled in this phase.",
      chargesEnabled: false,
    };
  }

  async authorizeMailing(
    input: AuthorizeMailingInput
  ): Promise<AuthorizeMailingResult> {
    if (input.mailingMode === "live") {
      if (!isCampaignLiveMailEnabled()) {
        return {
          allowed: false,
          reason: "live_disabled",
          message: "Paid live mailing is not enabled in this phase",
        };
      }
      return {
        allowed: true,
        authorizationId: `live-waived:${input.mailingId}`,
        amountCents: 0,
        currency: (input.currency ?? "USD").toUpperCase(),
        billingMode: "waived",
        duplicatePrevented: false,
      };
    }

    const unit =
      this.config.unitPostageCents + this.config.unitPlatformCents;
    const available = this.config.availableBudgetCents;

    if (available != null && unit > available) {
      return {
        allowed: false,
        reason: "insufficient_budget",
        message: "Insufficient available budget for this mailing",
      };
    }

    return {
      allowed: false,
      reason: "charges_disabled",
      message:
        "Paid pricing stub cannot collect payment yet. Use free/waived mode.",
    };
  }

  async settle(_authorizationId: string): Promise<{ settled: boolean }> {
    return { settled: false };
  }
}
