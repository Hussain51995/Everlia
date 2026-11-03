import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  FreePricingService,
  PaidPricingStubService,
  getPricingService,
} from "@/lib/campaigns/pricing";

describe("Phase 7 pricing abstraction", () => {
  it("UNIT_PASS: free quote is $0 with free testing banner", async () => {
    const quote = await new FreePricingService().quote({
      organizationId: "org",
      estimatedCardCount: 42,
      enrolledCustomerCount: 10,
      mailingMode: "test",
    });
    expect(quote.chargesEnabled).toBe(false);
    expect(quote.estimatedTotalCents).toBe(0);
    expect(quote.billingMode).toBe("waived");
    expect(quote.freeTestingBanner).toContain("Free Testing Mode");
    expect(quote.physicalMailDisclaimer.toLowerCase()).toContain("not sent");
  });

  it("UNIT_PASS: free authorize allows test and blocks live", async () => {
    const svc = new FreePricingService();
    const ok = await svc.authorizeMailing({
      organizationId: "org",
      campaignId: "c",
      mailingId: "m",
      mailingMode: "test",
    });
    expect(ok.allowed).toBe(true);
    if (ok.allowed) expect(ok.amountCents).toBe(0);

    const live = await svc.authorizeMailing({
      organizationId: "org",
      campaignId: "c",
      mailingId: "m2",
      mailingMode: "live",
    });
    expect(live.allowed).toBe(false);
  });

  it("UNIT_PASS: paid stub never enables charges and can deny budget", async () => {
    const stub = new PaidPricingStubService({
      unitPostageCents: 150,
      unitPlatformCents: 50,
      availableBudgetCents: 100,
    });
    const quote = await stub.quote({
      organizationId: "org",
      estimatedCardCount: 2,
      enrolledCustomerCount: 2,
      mailingMode: "test",
    });
    expect(quote.productMode).toBe("paid");
    expect(quote.estimatedTotalCents).toBe(400);
    expect(quote.chargesEnabled).toBe(false);

    const auth = await stub.authorizeMailing({
      organizationId: "org",
      campaignId: "c",
      mailingId: "m",
      mailingMode: "test",
    });
    expect(auth.allowed).toBe(false);
  });

  it("UNIT_PASS: getPricingService defaults to free", () => {
    const prev = process.env.CAMPAIGN_PRICING_MODE;
    delete process.env.CAMPAIGN_PRICING_MODE;
    expect(getPricingService().name).toBe("free");
    process.env.CAMPAIGN_PRICING_MODE = prev;
  });

  it("UNIT_PASS: migration 029 defines usage ledger", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/029_campaign_usage_and_billing.sql"
      ),
      "utf8"
    );
    expect(sql).toContain("campaign_usage_events");
    expect(sql).toContain("artwork_generated");
    expect(sql).toContain("test_mailings_count");
    expect(sql).toContain("committed_spend_cents");
  });

  it("UNIT_PASS: prices are not hardcoded in mailing-executor", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/campaigns/mailing-executor.ts"),
      "utf8"
    );
    expect(src).toContain("authorizeCampaignMailingSpend");
    expect(src).not.toMatch(/unitPostageCents\s*=\s*[1-9]/);
    expect(src).not.toMatch(/price\s*=\s*[1-9]/);
  });
});
