import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  escapeDynamicContent,
  computeMilestoneYears,
  listPlaceholdersInTemplate,
  resolveMessageTemplate,
  validateMessageTemplate,
} from "@/lib/campaigns/placeholders";
import {
  getOccasionMessageDefinition,
  parseMessageOverride,
  resolveOccasionCopy,
} from "@/lib/campaigns/messages";
import {
  analyzeMasterDesign,
  mapCopyToFieldValues,
} from "@/lib/campaigns/master-design";
import { personalizeCampaignCard } from "@/lib/campaigns/personalize";
import { defaultDesignConfig } from "@/lib/artwork/types";
import type { DesignConfig, DesignField } from "@/lib/types/cards";

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const sampleFront: DesignField[] = [
  {
    key: "customer_name",
    type: "text",
    x: 80,
    y: 500,
    width: 680,
    fontSize: 56,
    maxLines: 2,
  },
  {
    key: "personal_message",
    type: "text",
    x: 80,
    y: 600,
    width: 660,
    fontSize: 30,
    maxLines: 5,
  },
  {
    key: "footer_note",
    type: "text",
    x: 80,
    y: 1040,
    width: 680,
    fontSize: 20,
    maxLines: 2,
  },
];

const sampleBack: DesignField[] = [
  {
    key: "sender_name",
    type: "text",
    x: 80,
    y: 470,
    width: 680,
    fontSize: 32,
    maxLines: 1,
  },
  {
    key: "qr_code",
    type: "qr",
    x: 80,
    y: 850,
    size: 200,
  },
];

function sampleDesign(extraFront: DesignField[] = []): DesignConfig {
  return defaultDesignConfig([...sampleFront, ...extraFront], sampleBack);
}

describe("Phase 3 placeholders", () => {
  it("UNIT_PASS: validates known placeholders and rejects unknowns", () => {
    expect(
      validateMessageTemplate("Hello {{customer.firstName}}!")
    ).toEqual({
      ok: true,
      placeholders: ["customer.firstName"],
    });
    const bad = validateMessageTemplate("Hi {{customer.ssn}}");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.unknowns).toContain("customer.ssn");
  });

  it("UNIT_PASS: birthday greeting resolves first name", () => {
    const text = resolveMessageTemplate(
      "Happy Birthday, {{customer.firstName}}!",
      { customer: { firstName: "Alex", lastName: "Rivera" } }
    );
    expect(text).toBe("Happy Birthday, Alex!");
  });

  it("UNIT_PASS: home anniversary includes year count", () => {
    const text = resolveMessageTemplate(
      "Celebrating {{milestone.years}} years since your home closing!",
      { milestone: { years: 5 } }
    );
    expect(text).toBe("Celebrating 5 years since your home closing!");
  });

  it("UNIT_PASS: thanksgiving message has no required customer data", () => {
    const copy = resolveOccasionCopy({
      occasionSlug: "us-thanksgiving",
      context: { customer: { firstName: "Sam" } },
    });
    expect(copy.message).toContain("Thanksgiving");
    expect(copy.greeting).toContain("Sam");
  });

  it("UNIT_PASS: missing firstName cleans birthday punctuation", () => {
    const text = resolveMessageTemplate(
      "Happy Birthday, {{customer.firstName}}!",
      { customer: { firstName: "", lastName: "" } }
    );
    expect(text).toBe("Happy Birthday!");
  });

  it("UNIT_PASS: escapes dynamic content for UI contexts", () => {
    expect(escapeDynamicContent(`A <b>& "x"`)).toBe(
      "A &lt;b&gt;&amp; &quot;x&quot;"
    );
  });

  it("UNIT_PASS: overflow truncates with ellipsis", () => {
    const text = resolveMessageTemplate(
      "Wishing you and your family a wonderful Thanksgiving celebration together!",
      {},
      { maxLength: 40 }
    );
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(40);
  });

  it("UNIT_PASS: computeMilestoneYears handles anniversary math", () => {
    expect(computeMilestoneYears("2020-06-15", new Date("2025-06-15"))).toBe(5);
    expect(computeMilestoneYears("2020-06-15", new Date("2025-06-14"))).toBe(4);
  });
});

describe("Phase 3 occasion messages + overrides", () => {
  it("UNIT_PASS: default birthday / anniversary / custom definitions exist", () => {
    expect(getOccasionMessageDefinition("birthday").greetingTemplate).toContain(
      "Birthday"
    );
    expect(
      getOccasionMessageDefinition("home-anniversary").messageTemplate
    ).toContain("milestone.years");
    expect(getOccasionMessageDefinition("unknown-slug").slug).toBe("custom");
  });

  it("UNIT_PASS: user override replaces greeting and validates placeholders", () => {
    const override = parseMessageOverride(
      "Congrats on {{milestone.years}} years, {{customer.firstName}}!"
    );
    const copy = resolveOccasionCopy({
      occasionSlug: "home-anniversary",
      override,
      context: {
        customer: { firstName: "Jordan" },
        milestone: { years: 3 },
      },
    });
    expect(copy.greeting).toBe("Congrats on 3 years, Jordan!");
  });

  it("UNIT_PASS: JSON override can set message + clear footer", () => {
    const override = parseMessageOverride(
      JSON.stringify({
        messageTemplate: "Custom body for {{occasion.name}}",
        footerTemplate: null,
      })
    );
    const copy = resolveOccasionCopy({
      occasionSlug: "us-christmas",
      override,
      context: { occasion: { name: "Christmas" } },
    });
    expect(copy.message).toBe("Custom body for Christmas");
    expect(copy.footer).toBe("");
  });

  it("UNIT_PASS: lists placeholders used in a template", () => {
    expect(
      listPlaceholdersInTemplate(
        "{{customer.firstName}} / {{milestone.years}}"
      )
    ).toEqual(["customer.firstName", "milestone.years"]);
  });
});

describe("Phase 3 master design field mapping", () => {
  it("UNIT_PASS: existing templates map greeting into customer_name", () => {
    const design = sampleDesign();
    const map = analyzeMasterDesign(design);
    expect(map.hasCustomerName).toBe(true);
    expect(map.hasOccasionHeading).toBe(false);

    const values = mapCopyToFieldValues({
      designConfig: design,
      greeting: "Happy Birthday, Alex!",
      message: "Have a great day.",
      footer: "THANK YOU",
      recipientDisplayName: "Alex Rivera",
    });
    expect(values.customer_name).toBe("Happy Birthday, Alex!");
    expect(values.personal_message).toBe("Have a great day.");
    expect(values.footer_note).toBe("THANK YOU");
  });

  it("UNIT_PASS: occasion_heading region keeps recipient name separate", () => {
    const design = sampleDesign([
      {
        key: "occasion_heading",
        type: "text",
        x: 80,
        y: 400,
        width: 680,
        fontSize: 40,
        maxLines: 2,
      },
    ]);
    const values = mapCopyToFieldValues({
      designConfig: design,
      greeting: "Happy Birthday!",
      message: "Body",
      footer: "",
      recipientDisplayName: "Alex Rivera",
    });
    expect(values.occasion_heading).toBe("Happy Birthday!");
    expect(values.customer_name).toBe("Alex Rivera");
  });

  it("UNIT_PASS: personalizeCampaignCard fills sender + birthday copy", () => {
    const result = personalizeCampaignCard({
      designConfig: sampleDesign(),
      occasionSlug: "birthday",
      customer: { first_name: "Alex", last_name: "Rivera" },
      sender: {
        first_name: "Pat",
        last_name: "Lee",
        title: "Realtor",
        phone: "555-0100",
        email: "pat@example.com",
      },
    });
    expect(result.fieldValues.customer_name).toContain("Alex");
    expect(result.fieldValues.personal_message?.length).toBeGreaterThan(10);
    expect(result.fieldValues.sender_name).toBe("Pat Lee");
    expect(result.fieldValues.sender_title).toBe("Realtor");
    expect(result.fieldValues.phone).toBe("555-0100");
  });

  it("UNIT_PASS: anniversary personalize uses computed years", () => {
    const result = personalizeCampaignCard({
      designConfig: sampleDesign(),
      occasionSlug: "home-anniversary",
      customer: { first_name: "Casey", last_name: "Ng" },
      milestone: { anchor_date: "2019-03-01", type: "home_anniversary" },
      asOf: new Date("2025-03-01"),
    });
    expect(result.greeting).toContain("6 years");
    expect(result.message).toContain("6 years");
  });

  it("UNIT_PASS: missing-data custom occasion still produces copy", () => {
    const result = personalizeCampaignCard({
      designConfig: sampleDesign(),
      occasionSlug: "custom-event-x",
      customer: { first_name: "", last_name: "" },
    });
    expect(result.greeting.length).toBeGreaterThan(0);
    expect(result.message.length).toBeGreaterThan(0);
  });
});

describe("Phase 3 reuse / manual card safety", () => {
  it("CODE_REVIEW_PASS: preview API does not submit mail or mutate cards", () => {
    const src = readRepo("app/api/campaigns/preview/route.ts");
    expect(src).toContain("generateCampaignArtworkPreview");
    expect(src).toContain("mailingSubmitted: false");
    expect(src).not.toContain('.from("mail_transactions")');
    expect(src).not.toContain("getMailProvider");
    expect(src).not.toContain('.from("greeting_cards")');
  });

  it("CODE_REVIEW_PASS: artwork compose remains the shared renderer", () => {
    const preview = readRepo("lib/campaigns/preview.ts");
    expect(preview).toContain("composePostcardArtwork");
    expect(preview).toContain("postcardPngsToPdf");
    const helper = readRepo("lib/cards/generate-artwork.ts");
    expect(helper).toContain("composePostcardArtwork");
    const artworkRoute = readRepo("app/api/cards/[id]/artwork/route.ts");
    expect(artworkRoute).toContain("generateCardArtwork");
  });

  it("CODE_REVIEW_PASS: manual artwork route still uses raw field_values path", () => {
    const artworkRoute = readRepo("app/api/cards/[id]/artwork/route.ts");
    expect(artworkRoute).not.toContain("personalizeCampaignCard");
    const helper = readRepo("lib/cards/generate-artwork.ts");
    expect(helper).toContain("field_values");
    expect(helper).not.toContain("personalizeCampaignCard");
  });
});
