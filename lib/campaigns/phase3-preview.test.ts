import { describe, expect, it } from "vitest";
import { defaultDesignConfig } from "@/lib/artwork/types";
import type { DesignField } from "@/lib/types/cards";
import { generateCampaignArtworkPreview } from "@/lib/campaigns/preview";
import { personalizeCampaignCard } from "@/lib/campaigns/personalize";

const frontFields: DesignField[] = [
  {
    key: "customer_name",
    type: "text",
    x: 80,
    y: 500,
    width: 680,
    fontSize: 48,
    maxLines: 2,
    fontFamily: "Caveat, cursive",
  },
  {
    key: "personal_message",
    type: "text",
    x: 80,
    y: 620,
    width: 660,
    fontSize: 28,
    maxLines: 4,
  },
];

const backFields: DesignField[] = [
  {
    key: "sender_name",
    type: "text",
    x: 80,
    y: 470,
    width: 680,
    fontSize: 28,
    maxLines: 1,
    fontWeight: "bold",
  },
  {
    key: "qr_code",
    type: "qr",
    x: 80,
    y: 850,
    size: 200,
  },
];

describe("Phase 3 artwork preview (compose reuse)", () => {
  it("INTEGRATION_PASS: renders birthday / holiday / anniversary without mailing", async () => {
    const designConfig = defaultDesignConfig(frontFields, backFields);
    const cases = [
      { occasionSlug: "birthday", milestone: undefined },
      { occasionSlug: "us-thanksgiving", milestone: undefined },
      {
        occasionSlug: "home-anniversary",
        milestone: { anchor_date: "2018-05-01", type: "home_anniversary" },
      },
      { occasionSlug: "custom", milestone: undefined },
    ] as const;

    for (const c of cases) {
      const preview = await generateCampaignArtworkPreview({
        designConfig,
        frontBackgroundUrl: "/templates/birthday-classic/front.png",
        backBackgroundUrl: "/templates/birthday-classic/back.png",
        customer: { first_name: "Alex", last_name: "Rivera" },
        sender: { first_name: "Pat", last_name: "Lee" },
        occasionSlug: c.occasionSlug,
        milestone: c.milestone,
        includePdf: false,
      });

      expect(preview.frontPng.length).toBeGreaterThan(1000);
      expect(preview.backPng.length).toBeGreaterThan(1000);
      expect(preview.frontPngBase64.length).toBeGreaterThan(100);
      expect(preview.fieldValues.customer_name?.length).toBeGreaterThan(0);
      expect(preview.fieldValues.personal_message?.length).toBeGreaterThan(0);
      expect(preview.qrToken).toBe("campaign-preview");
    }
  }, 60_000);

  it("INTEGRATION_PASS: missing-data customer still renders artwork", async () => {
    const designConfig = defaultDesignConfig(frontFields, backFields);
    const preview = await generateCampaignArtworkPreview({
      designConfig,
      frontBackgroundUrl: "/templates/thank-you-warm/front.png",
      backBackgroundUrl: "/templates/thank-you-warm/back.png",
      customer: { first_name: "", last_name: "" },
      occasionSlug: "birthday",
    });
    expect(preview.frontPng.length).toBeGreaterThan(1000);
    expect(preview.greeting).toBe("Happy Birthday!");
  }, 30_000);

  it("UNIT_PASS: manual-style fieldValues bypass personalize and still compose", async () => {
    const designConfig = defaultDesignConfig(frontFields, backFields);
    const preview = await generateCampaignArtworkPreview({
      designConfig,
      frontBackgroundUrl: "/templates/birthday-classic/front.png",
      backBackgroundUrl: "/templates/birthday-classic/back.png",
      customer: { first_name: "Unused", last_name: "Name" },
      fieldValues: {
        customer_name: "Manual Card Name",
        personal_message: "Manual message unchanged",
        sender_name: "Manual Sender",
      },
    });
    expect(preview.fieldValues.customer_name).toBe("Manual Card Name");
    expect(preview.fieldValues.personal_message).toBe(
      "Manual message unchanged"
    );
    expect(preview.frontPng.length).toBeGreaterThan(1000);
  }, 30_000);

  it("UNIT_PASS: personalize does not mutate input customer object", () => {
    const customer = { first_name: "Alex", last_name: "Rivera" };
    personalizeCampaignCard({
      designConfig: defaultDesignConfig(frontFields, backFields),
      occasionSlug: "birthday",
      customer,
    });
    expect(customer).toEqual({ first_name: "Alex", last_name: "Rivera" });
  });
});
