import {
  composePostcardArtwork,
  postcardPngsToPdf,
} from "@/lib/artwork/compose";
import type { DesignConfig, GreetingCardFieldValues } from "@/lib/types/cards";
import {
  personalizeCampaignCard,
  type CampaignPersonalizeCustomer,
  type CampaignPersonalizeMilestone,
  type CampaignPersonalizeSender,
} from "@/lib/campaigns/personalize";
import type {
  OccasionMessageDefinition,
  OccasionMessageOverride,
} from "@/lib/campaigns/messages";

export const CAMPAIGN_PREVIEW_QR_TOKEN = "campaign-preview";

export type CampaignArtworkPreviewInput = {
  designConfig: DesignConfig;
  frontBackgroundUrl: string;
  backBackgroundUrl: string;
  customer: CampaignPersonalizeCustomer;
  sender?: CampaignPersonalizeSender | null;
  occasionSlug?: string | null;
  occasionName?: string | null;
  messageTemplateOverride?: string | OccasionMessageOverride | null;
  orgMessageDefinition?: OccasionMessageDefinition | null;
  milestone?: CampaignPersonalizeMilestone | null;
  campaignName?: string | null;
  baseFieldValues?: GreetingCardFieldValues;
  includePdf?: boolean;
  fieldValues?: GreetingCardFieldValues;
  qrToken?: string;
};

export type CampaignArtworkPreviewResult = {
  fieldValues: GreetingCardFieldValues;
  greeting?: string;
  message?: string;
  footer?: string;
  frontPng: Buffer;
  backPng: Buffer;
  pdf?: Buffer;
  frontPngBase64: string;
  backPngBase64: string;
  pdfBase64?: string;
  qrToken: string;
};

function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

export async function generateCampaignArtworkPreview(
  input: CampaignArtworkPreviewInput
): Promise<CampaignArtworkPreviewResult> {
  let fieldValues = input.fieldValues;
  let greeting: string | undefined;
  let message: string | undefined;
  let footer: string | undefined;

  if (!fieldValues) {
    const personalized = personalizeCampaignCard({
      designConfig: input.designConfig,
      occasionSlug: input.occasionSlug,
      occasionName: input.occasionName,
      messageTemplateOverride: input.messageTemplateOverride,
      orgMessageDefinition: input.orgMessageDefinition,
      customer: input.customer,
      sender: input.sender,
      milestone: input.milestone,
      campaignName: input.campaignName,
      baseFieldValues: input.baseFieldValues,
    });
    fieldValues = personalized.fieldValues;
    greeting = personalized.greeting;
    message = personalized.message;
    footer = personalized.footer;
  }

  const qrToken = input.qrToken?.trim() || CAMPAIGN_PREVIEW_QR_TOKEN;

  const { frontPng, backPng } = await composePostcardArtwork({
    designConfig: input.designConfig,
    frontBackgroundUrl: input.frontBackgroundUrl,
    backBackgroundUrl: input.backBackgroundUrl,
    fieldValues,
    qrToken,
  });

  let pdf: Buffer | undefined;
  let pdfBase64: string | undefined;
  if (input.includePdf) {
    pdf = await postcardPngsToPdf(frontPng, backPng);
    pdfBase64 = toBase64(pdf);
  }

  return {
    fieldValues,
    greeting,
    message,
    footer,
    frontPng,
    backPng,
    pdf,
    frontPngBase64: toBase64(frontPng),
    backPngBase64: toBase64(backPng),
    pdfBase64,
    qrToken,
  };
}
