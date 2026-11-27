import { describe, expect, it } from "vitest";
import {
  adjustSendOnForPostalCalendar,
  computeArtworkPrepareOn,
  isUspsNonDeliveryDay,
  uspsHolidaysForYear,
} from "@/lib/campaigns/postal-calendar";
import { isMailingAlreadyCommitted } from "@/lib/campaigns/preflight";
import { computeNextRetryAt, MAX_MAILING_RETRIES } from "@/lib/campaigns/retry";
import { mailingIdempotencyKey } from "@/lib/campaigns/schedule";
import {
  assertCampaignMailingModeAllowed,
  assertTestProviderEnvironment,
  isCampaignLiveMailEnabled,
  isCampaignWorkerMode,
} from "@/lib/mail/mode-guard";
import { readFileSync } from "fs";
import { join } from "path";

describe("Phase 6 postal calendar", () => {
  it("UNIT_PASS: weekends are non-delivery days", () => {
    expect(isUspsNonDeliveryDay("2026-07-04")).toBe(true);
    expect(isUspsNonDeliveryDay("2026-07-03")).toBe(true);
  });

  it("UNIT_PASS: Thanksgiving 2026 is a USPS holiday", () => {
    const holidays = uspsHolidaysForYear(2026);
    expect(holidays.has("2026-11-26")).toBe(true);
  });

  it("UNIT_PASS: adjustSendOn moves weekend earlier, never later", () => {
    expect(adjustSendOnForPostalCalendar("2026-11-01")).toBe("2026-10-30");
  });

  it("UNIT_PASS: artwork prepare is before send_on", () => {
    const sendOn = "2026-06-15";
    const prep = computeArtworkPrepareOn(sendOn, 2);
    expect(prep < sendOn).toBe(true);
  });
});

describe("Phase 6 mode guards", () => {
  it("UNIT_PASS: worker runs test; live only when env-gated", () => {
    const prevLive = process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    const prevMode = process.env.POSTGRID_MODE;
    delete process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    process.env.POSTGRID_MODE = "test";

    expect(isCampaignWorkerMode("test")).toBe(true);
    expect(isCampaignWorkerMode("live")).toBe(false);
    expect(isCampaignWorkerMode("dry_run")).toBe(false);
    expect(isCampaignLiveMailEnabled()).toBe(false);

    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = "true";
    process.env.POSTGRID_MODE = "live";
    expect(isCampaignLiveMailEnabled()).toBe(true);
    expect(isCampaignWorkerMode("live")).toBe(true);

    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = prevLive;
    process.env.POSTGRID_MODE = prevMode;
  });

  it("UNIT_PASS: live campaign mode blocked by default", () => {
    const prevLive = process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    const prevMode = process.env.POSTGRID_MODE;
    delete process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    process.env.POSTGRID_MODE = "test";
    expect(() => assertCampaignMailingModeAllowed("live")).toThrow(/disabled/i);
    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = prevLive;
    process.env.POSTGRID_MODE = prevMode;
  });

  it("UNIT_PASS: test mode refuses live provider environment", () => {
    expect(() => assertTestProviderEnvironment("live")).toThrow(/live/i);
    expect(() => assertTestProviderEnvironment("test")).not.toThrow();
  });
});

describe("Phase 6 preflight commit gate", () => {
  it("UNIT_PASS: greeting_card_id mid-pipeline is not duplicate_committed", () => {
    expect(
      isMailingAlreadyCommitted({
        status: "ready",
        greeting_card_id: "card-1",
        mail_transaction_id: null,
      })
    ).toBe(false);
    expect(
      isMailingAlreadyCommitted({
        status: "generating",
        greeting_card_id: "card-1",
        mail_transaction_id: null,
      })
    ).toBe(false);
    expect(
      isMailingAlreadyCommitted({
        status: "submitting",
        greeting_card_id: "card-1",
        mail_transaction_id: null,
      })
    ).toBe(false);
  });

  it("UNIT_PASS: submitted or provider transaction is duplicate_committed", () => {
    expect(
      isMailingAlreadyCommitted({
        status: "submitted",
        greeting_card_id: "card-1",
        mail_transaction_id: null,
      })
    ).toBe(true);
    expect(
      isMailingAlreadyCommitted({
        status: "ready",
        greeting_card_id: "card-1",
        mail_transaction_id: "tx-1",
      })
    ).toBe(true);
  });
});

describe("Phase 6 retry + idempotency", () => {
  it("UNIT_PASS: exponential backoff increases then caps", () => {
    const t0 = computeNextRetryAt(0, new Date("2026-01-01T00:00:00Z")).getTime();
    const t3 = computeNextRetryAt(3, new Date("2026-01-01T00:00:00Z")).getTime();
    const t20 = computeNextRetryAt(20, new Date("2026-01-01T00:00:00Z")).getTime();
    expect(t3).toBeGreaterThan(t0);
    expect(t20 - Date.parse("2026-01-01T00:00:00Z")).toBe(360 * 60_000);
    expect(MAX_MAILING_RETRIES).toBe(5);
  });

  it("UNIT_PASS: idempotency key prevents duplicate provider keys", () => {
    const a = mailingIdempotencyKey({
      campaignId: "c",
      customerId: "u",
      campaignOccasionId: "o",
      occasionDate: "2026-12-25",
    });
    const b = mailingIdempotencyKey({
      campaignId: "c",
      customerId: "u",
      campaignOccasionId: "o",
      occasionDate: "2026-12-25",
    });
    expect(a).toBe(b);
  });
});

describe("Phase 6 migration + cron surface", () => {
  it("UNIT_PASS: migration 028 defines claim RPC and artwork_prepare_on", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/028_campaign_mailing_engine.sql"
      ),
      "utf8"
    );
    expect(sql).toContain("artwork_prepare_on");
    expect(sql).toContain("claim_campaign_mailings");
    expect(sql).toContain("skip locked");
    expect(sql).toContain("next_retry_at");
  });

  it("UNIT_PASS: cron route exists and references worker", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/cron/campaign-mailings/route.ts"),
      "utf8"
    );
    expect(src).toContain("CRON_SECRET");
    expect(src).toContain("runCampaignMailingWorker");
    expect(src).toContain("isCampaignLiveMailEnabled");
    expect(src).toContain("liveMailEnabled");
  });

  it("UNIT_PASS: migration 032 claims live campaigns", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/032_claim_live_campaign_mailings.sql"
      ),
      "utf8"
    );
    expect(sql).toContain("claim_campaign_mailings");
    expect(sql).toContain("'live'");
    expect(sql).toContain("'test'");
  });

  it("UNIT_PASS: vercel cron schedule configured daily (Hobby-compatible)", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8")
    ) as { crons: Array<{ path: string; schedule: string }> };
    const campaignCron = vercel.crons.find(
      (c) => c.path === "/api/cron/campaign-mailings"
    );
    expect(campaignCron?.schedule).toBe("0 0 * * *");
  });
});
