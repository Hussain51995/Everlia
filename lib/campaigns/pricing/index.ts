import { FreePricingService } from "@/lib/campaigns/pricing/free";
import { PaidPricingStubService } from "@/lib/campaigns/pricing/paid-stub";
import type { PricingService } from "@/lib/campaigns/pricing/types";

export type {
  AuthorizeMailingInput,
  AuthorizeMailingResult,
  PricingProductMode,
  PricingQuote,
  PricingQuoteInput,
  PricingService,
} from "@/lib/campaigns/pricing/types";

export { FreePricingService } from "@/lib/campaigns/pricing/free";
export { PaidPricingStubService } from "@/lib/campaigns/pricing/paid-stub";

export function getPricingService(options?: {
  force?: "free" | "paid_stub";
  paidConfig?: ConstructorParameters<typeof PaidPricingStubService>[0];
}): PricingService {
  const force =
    options?.force ??
    (process.env.CAMPAIGN_PRICING_MODE === "paid_stub" ? "paid_stub" : "free");

  if (force === "paid_stub") {
    return new PaidPricingStubService(
      options?.paidConfig ?? {
        unitPostageCents: Number(process.env.CAMPAIGN_UNIT_POSTAGE_CENTS ?? 0),
        unitPlatformCents: Number(process.env.CAMPAIGN_UNIT_PLATFORM_CENTS ?? 0),
        currency: process.env.CAMPAIGN_PRICING_CURRENCY ?? "USD",
        availableBudgetCents: null,
        billingMode: "usage",
      }
    );
  }

  return new FreePricingService();
}
