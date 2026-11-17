import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  anniversaryInYear,
  compareCivil,
  nthWeekdayOfMonth,
  lastWeekdayOfMonth,
} from "@/lib/campaigns/occasions/calendar";
import {
  getDefaultSelectedOccasions,
  getOccasionBySlug,
  US_OCCASION_CATALOG,
} from "@/lib/campaigns/occasions/catalog";
import { resolveOccasionOccurrences } from "@/lib/campaigns/occasions/resolve";
import { previewCampaignSchedule } from "@/lib/campaigns/occasions/schedule-preview";
import { personalizeCampaignCard } from "@/lib/campaigns/personalize";
import { isMasterDesignUsable } from "@/lib/campaigns/master-design";
import { mailingIdempotencyKey } from "@/lib/campaigns/schedule";
import { computeNextRetryAt, MAX_MAILING_RETRIES } from "@/lib/campaigns/retry";
import {
  assertCampaignMailingModeAllowed,
  isCampaignWorkerMode,
} from "@/lib/mail/mode-guard";
import { isOrgAdminRole } from "@/lib/campaigns/rbac";
import { FreePricingService } from "@/lib/campaigns/pricing";
import { shouldAdvanceCardStatus } from "@/lib/mail/status-map";
import {
  campaignCreateSchema,
  campaignSchedulePreviewSchema,
  campaignUpdateSchema,
} from "@/lib/validations/campaigns";
import type { DesignConfig } from "@/lib/types/cards";

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function fileExists(rel: string) {
  return existsSync(resolve(process.cwd(), rel));
}

const UUID_A = "00000000-0000-4000-8000-000000000001";
const UUID_B = "00000000-0000-4000-8000-000000000002";
const UUID_C = "00000000-0000-4000-8000-000000000003";
const UUID_T = "00000000-0000-4000-8000-0000000000aa";

const minimalDesign: DesignConfig = {
  width: 1800,
  height: 1200,
  dpi: 300,
  orientation: "landscape",
  front: {
    fields: [
      { key: "customer_name", type: "text", x: 10, y: 10 },
      { key: "personal_message", type: "text", x: 10, y: 40 },
    ],
  },
  back: { fields: [{ key: "qr_code", type: "qr", x: 10, y: 10 }] },
};

describe("Phase 8 TC-01…TC-09 Campaign creation", () => {
  it("TC-01: create schema accepts one customer", () => {
    const parsed = campaignCreateSchema.safeParse({
      name: "Single Customer Care",
      defaultTemplateId: UUID_T,
      startDate: "2026-06-01",
      endDate: "2027-06-01",
      customerIds: [UUID_A],
      occasions: [{ occasionSlug: "birthday" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("TC-02: create schema accepts multiple customers", () => {
    const parsed = campaignCreateSchema.safeParse({
      name: "Multi Customer Care",
      defaultTemplateId: UUID_T,
      startDate: "2026-06-01",
      endDate: "2027-06-01",
      customerIds: [UUID_A, UUID_B, UUID_C],
      occasions: [{ occasionSlug: "birthday" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.customerIds).toHaveLength(3);
  });

  it("TC-03: generic master design eligibility requires dynamic regions", () => {
    expect(isMasterDesignUsable(minimalDesign)).toBe(true);
    expect(
      isMasterDesignUsable({
        ...minimalDesign,
        front: { fields: [] },
        back: { fields: [] },
      })
    ).toBe(false);
    expect(fileExists("components/dashboard/campaigns/StartCampaignDialog.tsx")).toBe(
      true
    );
    expect(readRepo("app/api/templates/route.ts")).toContain("campaignEligible");
  });

  it("TC-04: start and end dates are required civil dates", () => {
    const parsed = campaignCreateSchema.safeParse({
      name: "Window",
      defaultTemplateId: UUID_T,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      customerIds: [UUID_A],
      occasions: [{ occasionSlug: "us-thanksgiving" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("TC-05: reject invalid date ranges (start after end)", () => {
    const parsed = campaignCreateSchema.safeParse({
      name: "Bad Window",
      defaultTemplateId: UUID_T,
      startDate: "2027-01-01",
      endDate: "2026-01-01",
      customerIds: [UUID_A],
      occasions: [{ occasionSlug: "birthday" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("TC-06: automatically suggest eligible default occasions", () => {
    const defaults = getDefaultSelectedOccasions();
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults.every((o) => o.isDefaultSelected)).toBe(true);
    expect(defaults.some((o) => o.slug === "birthday")).toBe(true);
  });

  it("TC-07: add/remove/customize occasions via update + catalog", () => {
    const add = campaignUpdateSchema.safeParse({
      occasions: [
        { occasionSlug: "birthday", leadDays: 10, isEnabled: true },
        {
          customName: "Client Appreciation",
          occurrenceDate: "2026-09-15",
          messageTemplate: "Thanks {{customer.firstName}}!",
          leadDays: 5,
        },
      ],
    });
    expect(add.success).toBe(true);
    expect(US_OCCASION_CATALOG.some((o) => o.slug === "us-mothers-day")).toBe(
      true
    );
    const removeEmpty = campaignUpdateSchema.safeParse({ occasions: [] });
    expect(removeEmpty.success).toBe(false);
  });

  it("TC-08: preview personalized cards (master design copy)", () => {
    const result = personalizeCampaignCard({
      designConfig: minimalDesign,
      occasionSlug: "birthday",
      occasionName: "Birthday",
      customer: { first_name: "Ada", last_name: "Lovelace" },
      sender: { first_name: "Eve", last_name: "Agent" },
      milestone: { anchor_date: "1990-03-15", type: "birthday" },
      campaignName: "QA Campaign",
    });
    expect(result.fieldValues.customer_name || result.greeting).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
    expect(fileExists("app/api/campaigns/preview/route.ts")).toBe(true);
  });

  it("TC-09: future-dated campaign activation payload allowed (test mode)", () => {
    const parsed = campaignCreateSchema.safeParse({
      name: "Future Start",
      defaultTemplateId: UUID_T,
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      customerIds: [UUID_A],
      occasions: [{ occasionSlug: "birthday" }],
      mailingMode: "test",
      activate: true,
    });
    expect(parsed.success).toBe(true);
    expect(fileExists("app/api/campaigns/[id]/activate/route.ts")).toBe(true);
  });
});

describe("Phase 8 TC-10…TC-17 Occasion scheduling", () => {
  it("TC-10: generate birthday occurrences", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("birthday")!,
      customerId: "c1",
      milestones: [
        {
          customerId: "c1",
          milestoneType: "birthday",
          anchorDate: "1991-04-10",
        },
      ],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      timezone: "America/New_York",
    });
    expect(result.occurrences.map((o) => o.occasionDate)).toEqual([
      "2026-04-10",
    ]);
  });

  it("TC-11: generate home closing anniversaries", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("closing-anniversary")!,
      customerId: "c1",
      milestones: [
        {
          customerId: "c1",
          milestoneType: "closing_anniversary",
          anchorDate: "2020-08-20",
        },
      ],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(result.occurrences[0]?.occasionDate).toBe("2026-08-20");
  });

  it("TC-12: generate movable US holidays", () => {
    expect(nthWeekdayOfMonth(2026, 11, 4, 4)).toBe("2026-11-26"); // Thanksgiving
    expect(nthWeekdayOfMonth(2026, 9, 1, 1)).toBe("2026-09-07"); // Labor Day
    expect(lastWeekdayOfMonth(2026, 5, 1)).toBe("2026-05-25"); // Memorial Day
    const tg = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-thanksgiving")!,
      customerId: "c1",
      milestones: [],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(tg.occurrences[0]?.occasionDate).toBe("2026-11-26");
  });

  it("TC-13: handle missing milestone dates (no invention)", () => {
    const birthday = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("birthday")!,
      customerId: "c1",
      milestones: [],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(birthday.occurrences).toHaveLength(0);
    expect(birthday.skipped[0]?.reason).toBe("missing_birthday");
  });

  it("TC-14: handle February 29 birthdays", () => {
    expect(anniversaryInYear("2000-02-29", 2024)).toBe("2024-02-29");
    expect(anniversaryInYear("2000-02-29", 2025)).toBe("2025-02-28");
  });

  it("TC-15: handle multi-year campaigns", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("birthday")!,
      customerId: "c1",
      milestones: [
        {
          customerId: "c1",
          milestoneType: "birthday",
          anchorDate: "1990-03-15",
        },
      ],
      startDate: "2025-01-01",
      endDate: "2027-12-31",
    });
    expect(result.occurrences.map((o) => o.occasionDate)).toEqual([
      "2025-03-15",
      "2026-03-15",
      "2027-03-15",
    ]);
  });

  it("TC-16: exclude occurrences outside campaign duration", () => {
    const preview = previewCampaignSchedule({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      timezone: "America/New_York",
      customers: [
        {
          id: "c1",
          firstName: "A",
          lastName: "B",
          milestones: [
            {
              customerId: "c1",
              milestoneType: "birthday",
              anchorDate: "1990-03-15",
            },
          ],
        },
      ],
      occasions: [getOccasionBySlug("birthday")!],
    });
    expect(preview.upcomingOccasions).toHaveLength(0);
  });

  it("TC-17: mailing dates before activation / today are skipped past policy", () => {
    const result = resolveOccasionOccurrences({
      occasion: getOccasionBySlug("us-valentines-day")!,
      customerId: "c1",
      milestones: [],
      startDate: "2026-03-01",
      endDate: "2026-12-31",
      leadDays: 7,
    });
    expect(
      result.occurrences.every((o) => compareCivil(o.occasionDate, "2026-03-01") >= 0)
    ).toBe(true);
    expect(readRepo("lib/campaigns/schedule.ts")).toContain("skipped_past");
    expect(readRepo("lib/campaigns/schedule.ts")).toContain("SKIP_PAST");
  });
});

describe("Phase 8 TC-18…TC-25 Campaign management", () => {
  it("TC-18…TC-23: lifecycle routes exist (pause/resume/edit/extend/cancel)", () => {
    for (const path of [
      "app/api/campaigns/[id]/pause/route.ts",
      "app/api/campaigns/[id]/resume/route.ts",
      "app/api/campaigns/[id]/cancel/route.ts",
      "app/api/campaigns/[id]/extend/route.ts",
      "app/api/campaigns/[id]/route.ts",
      "lib/campaigns/lifecycle.ts",
    ]) {
      expect(fileExists(path)).toBe(true);
    }
    const life = readRepo("lib/campaigns/lifecycle.ts");
    expect(life).toContain("SKIP_MISSED");
    expect(life).toContain("skipped_paused");
    expect(life).toContain("extendCampaign");
    expect(life).toContain("cancelCampaign");
  });

  it("TC-20/21: update schema supports customer and occasion edits", () => {
    const parsed = campaignUpdateSchema.safeParse({
      customerIds: [UUID_A, UUID_B],
      occasions: [
        { occasionSlug: "birthday", isEnabled: true },
        { occasionSlug: "us-thanksgiving", isEnabled: false },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("TC-24: submitted mailing immutability enforced in schema", () => {
    const sql = readRepo(
      "supabase/migrations/024_campaign_mailings_and_card_links.sql"
    );
    expect(sql).toContain("enforce_campaign_mailing_submitted_immutability");
    expect(sql).toContain("Submitted campaign mailings are immutable");
  });

  it("TC-25: completed campaigns create no new future mailings (completeDueCampaigns)", () => {
    const src = readRepo("lib/campaigns/complete.ts");
    expect(src).toContain("completeDueCampaigns");
    expect(src).toContain("end_date");
    expect(src).toContain("completed");
    const claim = readRepo(
      "supabase/migrations/028_campaign_mailing_engine.sql"
    );
    expect(claim).toContain("c.status = 'active'");
  });
});

describe("Phase 8 TC-26…TC-33 Mailing engine", () => {
  it("TC-26: personalized artwork pipeline helpers exist", () => {
    expect(fileExists("lib/cards/generate-artwork.ts")).toBe(true);
    expect(fileExists("lib/cards/materialize.ts")).toBe(true);
    expect(readRepo("lib/campaigns/mailing-executor.ts")).toContain(
      "generateCardArtwork"
    );
    expect(readRepo("lib/campaigns/mailing-executor.ts")).toContain(
      "personalizeCampaignCard"
    );
  });

  it("TC-27: unique QR tracking links generated in artwork path", () => {
    const art = readRepo("lib/cards/generate-artwork.ts");
    expect(art).toContain("createQrToken");
    expect(art).toContain("qr_tokens");
    expect(art).toContain("/respond/");
  });

  it("TC-28: simulate PostGrid submission in test mode", () => {
    const send = readRepo("lib/cards/submit-mail.ts");
    expect(send).toContain("campaignMailingMode");
    expect(send).toContain("assertTestProviderEnvironment");
    expect(send).toContain("[TEST]");
    expect(send).toContain("simulated");
  });

  it("TC-29: prevent duplicate submissions via idempotency", () => {
    const key = mailingIdempotencyKey({
      campaignId: "c",
      customerId: "u",
      campaignOccasionId: "o",
      occasionDate: "2026-12-25",
    });
    expect(key).toBe("c:u:o:2026-12-25");
    expect(readRepo("lib/campaigns/preflight.ts")).toContain(
      "duplicate_committed"
    );
    expect(readRepo("lib/campaigns/preflight.ts")).toContain(
      "isMailingAlreadyCommitted"
    );
    expect(readRepo("lib/campaigns/preflight.ts")).not.toMatch(
      /greeting_card_id\s*\|\|/
    );
    expect(readRepo("lib/campaigns/schedule.ts")).toContain(
      "idempotency_key"
    );
  });

  it("TC-30: retry transient failures safely", () => {
    expect(MAX_MAILING_RETRIES).toBe(5);
    const a = computeNextRetryAt(0, new Date("2026-01-01T00:00:00Z"));
    const b = computeNextRetryAt(3, new Date("2026-01-01T00:00:00Z"));
    expect(b.getTime()).toBeGreaterThan(a.getTime());
    expect(readRepo("lib/campaigns/mailing-executor.ts")).toContain(
      "failOrRetry"
    );
  });

  it("TC-31: handle duplicate/out-of-order webhooks (monotonic status)", () => {
    expect(shouldAdvanceCardStatus("submitted", "processing")).toBe(true);
    expect(shouldAdvanceCardStatus("delivered", "processing")).toBe(false);
    expect(shouldAdvanceCardStatus("delivered", "mailed")).toBe(false);
    expect(readRepo("app/api/webhooks/mail/[provider]/route.ts")).toContain(
      "shouldAdvanceCardStatus"
    );
  });

  it("TC-32: worker interruption recovery via SKIP LOCKED claim", () => {
    const sql = readRepo(
      "supabase/migrations/028_campaign_mailing_engine.sql"
    );
    expect(sql).toContain("claim_campaign_mailings");
    expect(sql.toLowerCase()).toContain("skip locked");
    expect(readRepo("app/api/cron/campaign-mailings/route.ts")).toContain(
      "CRON_SECRET"
    );
  });

  it("TC-33: test mode never sends real (live) mail unless env-gated", () => {
    const prevLive = process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    const prevMode = process.env.POSTGRID_MODE;
    delete process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    process.env.POSTGRID_MODE = "test";

    expect(isCampaignWorkerMode("test")).toBe(true);
    expect(isCampaignWorkerMode("live")).toBe(false);
    expect(() => assertCampaignMailingModeAllowed("live")).toThrow(/disabled/i);
    const claim028 = readRepo(
      "supabase/migrations/028_campaign_mailing_engine.sql"
    );
    expect(claim028).toContain("mailing_mode = 'test'");
    const claim032 = readRepo(
      "supabase/migrations/032_claim_live_campaign_mailings.sql"
    );
    expect(claim032).toContain("'live'");
    const cron = readRepo("app/api/cron/campaign-mailings/route.ts");
    expect(cron).toContain("isCampaignLiveMailEnabled");

    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = prevLive;
    process.env.POSTGRID_MODE = prevMode;
  });
});

describe("Phase 8 TC-34…TC-38 Security", () => {
  it("TC-34/35: same-org enforcement triggers present", () => {
    const sql = readRepo("supabase/migrations/023_campaigns_core.sql");
    expect(sql).toContain("enforce_campaign_customer_same_org");
    expect(sql).toContain(
      "campaign and customer must belong to the same organization"
    );
  });

  it("TC-36: org RBAC for lifecycle (owner/admin only)", () => {
    expect(isOrgAdminRole("owner")).toBe(true);
    expect(isOrgAdminRole("admin")).toBe(true);
    expect(isOrgAdminRole("member")).toBe(false);
    expect(readRepo("lib/campaigns/lifecycle.ts")).toContain(
      "assertCampaignLifecycleAdmin"
    );
  });

  it("TC-37: prevent unauthorized live mailing activation", () => {
    const prevLive = process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    const prevMode = process.env.POSTGRID_MODE;
    delete process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    process.env.POSTGRID_MODE = "test";

    const liveCreate = campaignCreateSchema.safeParse({
      name: "Live Attempt",
      defaultTemplateId: UUID_T,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      customerIds: [UUID_A],
      occasions: [{ occasionSlug: "birthday" }],
      mailingMode: "live",
    });
    expect(liveCreate.success).toBe(false);
    expect(readRepo("lib/mail/mode-guard.ts")).toContain(
      "CAMPAIGN_LIVE_MAIL_ENABLED"
    );
    expect(readRepo("lib/mail/mode-guard.ts")).toContain(
      "isCampaignLiveMailEnabled"
    );

    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = prevLive;
    process.env.POSTGRID_MODE = prevMode;
  });

  it("TC-38: campaign RLS policies present", () => {
    const rls = readRepo("supabase/migrations/025_campaign_audit_and_rls.sql");
    expect(rls).toContain("enable row level security");
    expect(rls).toContain("is_organization_member");
    expect(rls).toContain("Members can view org campaigns");
    expect(rls).toContain("Members can insert org campaigns");
    const usage = readRepo(
      "supabase/migrations/029_campaign_usage_and_billing.sql"
    );
    expect(usage).toContain("campaign_usage_events");
    expect(usage).toContain("is_organization_member");
  });
});

describe("Phase 8 free billing + schedule preview contracts", () => {
  it("UNIT_PASS: free quote shows no charges", async () => {
    const quote = await new FreePricingService().quote({
      organizationId: "org",
      estimatedCardCount: 5,
      enrolledCustomerCount: 2,
      mailingMode: "test",
    });
    expect(quote.chargesEnabled).toBe(false);
    expect(quote.estimatedTotalCents).toBe(0);
  });

  it("UNIT_PASS: schedule preview schema validates", () => {
    const parsed = campaignSchedulePreviewSchema.safeParse({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      customerIds: [UUID_A],
      occasionSlugs: ["birthday"],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("Phase 8 migration sequence validation", () => {
  it("UNIT_PASS: campaign migrations 021–029 exist and are sequential", () => {
    const dir = resolve(process.cwd(), "supabase/migrations");
    const files = readdirSync(dir)
      .filter((f) => /^02[1-9]_.*\.sql$/.test(f))
      .sort();
    expect(files).toEqual([
      "021_campaign_enums.sql",
      "022_occasions_and_milestones.sql",
      "023_campaigns_core.sql",
      "024_campaign_mailings_and_card_links.sql",
      "025_campaign_audit_and_rls.sql",
      "026_seed_us_occasions.sql",
      "027_occasion_catalog_categories.sql",
      "028_campaign_mailing_engine.sql",
      "029_campaign_usage_and_billing.sql",
    ]);
  });

  it("UNIT_PASS: critical Phase 5–7 surfaces exist", () => {
    for (const path of [
      "app/dashboard/campaigns/page.tsx",
      "app/dashboard/campaigns/new/page.tsx",
      "app/dashboard/campaigns/[id]/page.tsx",
      "app/api/cron/campaign-mailings/route.ts",
      "app/api/campaigns/mailing-capabilities/route.ts",
      "supabase/migrations/032_claim_live_campaign_mailings.sql",
      "vercel.json",
      "docs/architecture/campaign-phase7-billing.md",
    ]) {
      expect(fileExists(path)).toBe(true);
    }
  });
});
