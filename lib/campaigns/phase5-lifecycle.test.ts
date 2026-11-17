import { describe, expect, it } from "vitest";
import { todayInTimezone } from "@/lib/campaigns/civil-today";
import { mailingIdempotencyKey } from "@/lib/campaigns/schedule";
import { isOrgAdminRole } from "@/lib/campaigns/rbac";
import { isMasterDesignUsable } from "@/lib/campaigns/master-design";
import { campaignCreateSchema } from "@/lib/validations/campaigns";
import type { DesignConfig } from "@/lib/types/cards";

describe("Phase 5 campaign helpers", () => {
  it("UNIT_PASS: todayInTimezone returns YYYY-MM-DD", () => {
    const today = todayInTimezone("America/New_York", new Date("2026-06-15T18:00:00Z"));
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("UNIT_PASS: mailing idempotency key is stable", () => {
    expect(
      mailingIdempotencyKey({
        campaignId: "c1",
        customerId: "u1",
        campaignOccasionId: "o1",
        occasionDate: "2026-12-25",
      })
    ).toBe("c1:u1:o1:2026-12-25");
  });

  it("UNIT_PASS: org admin roles include owner/admin/org_admin", () => {
    expect(isOrgAdminRole("owner")).toBe(true);
    expect(isOrgAdminRole("admin")).toBe(true);
    expect(isOrgAdminRole("org_admin")).toBe(true);
    expect(isOrgAdminRole("member")).toBe(false);
  });

  it("UNIT_PASS: live mode rejected by create schema when disabled", () => {
    const prevLive = process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    const prevMode = process.env.POSTGRID_MODE;
    delete process.env.CAMPAIGN_LIVE_MAIL_ENABLED;
    process.env.POSTGRID_MODE = "test";

    const parsed = campaignCreateSchema.safeParse({
      name: "Test",
      defaultTemplateId: "00000000-0000-4000-8000-000000000001",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      customerIds: ["00000000-0000-4000-8000-000000000002"],
      occasions: [{ occasionSlug: "birthday" }],
      mailingMode: "live",
    });
    expect(parsed.success).toBe(false);

    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = "true";
    process.env.POSTGRID_MODE = "live";
    const allowed = campaignCreateSchema.safeParse({
      name: "Test",
      defaultTemplateId: "00000000-0000-4000-8000-000000000001",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      customerIds: ["00000000-0000-4000-8000-000000000002"],
      occasions: [{ occasionSlug: "birthday" }],
      mailingMode: "live",
    });
    expect(allowed.success).toBe(true);

    process.env.CAMPAIGN_LIVE_MAIL_ENABLED = prevLive;
    process.env.POSTGRID_MODE = prevMode;
  });

  it("UNIT_PASS: master design eligibility requires a dynamic text region", () => {
    const empty: DesignConfig = {
      width: 1,
      height: 1,
      dpi: 300,
      orientation: "landscape",
      front: { fields: [] },
      back: { fields: [] },
    };
    expect(isMasterDesignUsable(empty)).toBe(false);

    const usable: DesignConfig = {
      ...empty,
      front: {
        fields: [
          {
            key: "customer_name",
            type: "text",
            x: 0,
            y: 0,
          },
        ],
      },
    };
    expect(isMasterDesignUsable(usable)).toBe(true);
  });
});
