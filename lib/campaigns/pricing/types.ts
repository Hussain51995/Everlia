import type {
  CampaignBillingMode,
  CampaignBillingState,
  CampaignMailingMode,
} from "@/lib/types/campaigns";

export type PricingProductMode = "free" | "paid";

export type PricingQuoteInput = {
  organizationId: string;
  campaignId?: string;
  currency?: string;
  estimatedCardCount: number;
  enrolledCustomerCount: number;
  mailingMode: CampaignMailingMode;
  spendingLimitCents?: number | null;
};

export type PricingQuote = {
  productMode: PricingProductMode;
  billingMode: CampaignBillingMode;
  billingState: CampaignBillingState;
  currency: string;
  unitPostageCents: number;
  unitPlatformCents: number;
  estimatedCardCount: number;
  estimatedTotalCents: number;
  spendingLimitCents: number | null;
  availableBudgetCents: number | null;
  committedSpendCents: number;
  displayLabel: string;
  freeTestingBanner: string | null;
  physicalMailDisclaimer: string;
  chargesEnabled: boolean;
};

export type AuthorizeMailingInput = {
  organizationId: string;
  campaignId: string;
  mailingId: string;
  mailingMode: CampaignMailingMode;
  currency?: string;
};

export type AuthorizeMailingResult =
  | {
      allowed: true;
      authorizationId: string;
      amountCents: number;
      currency: string;
      billingMode: CampaignBillingMode;
      duplicatePrevented: boolean;
    }
  | {
      allowed: false;
      reason:
        | "insufficient_budget"
        | "charges_disabled"
        | "live_disabled"
        | "duplicate"
        | "not_configured";
      message: string;
    };

export type PricingService = {
  readonly name: string;
  quote(input: PricingQuoteInput): Promise<PricingQuote>;
  authorizeMailing(
    input: AuthorizeMailingInput
  ): Promise<AuthorizeMailingResult>;
  settle?(authorizationId: string): Promise<{ settled: boolean }>;
};
