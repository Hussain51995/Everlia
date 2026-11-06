import type {
  DesignConfig,
  GreetingCardFieldValues,
} from "@/lib/types/cards";
import {
  parseMessageOverride,
  resolveOccasionCopy,
  type OccasionMessageOverride,
} from "@/lib/campaigns/messages";
import {
  assertMasterDesignUsable,
  mapCopyToFieldValues,
} from "@/lib/campaigns/master-design";
import {
  computeMilestoneYears,
  type PlaceholderContext,
} from "@/lib/campaigns/placeholders";

export type CampaignPersonalizeCustomer = {
  first_name: string;
  last_name: string;
};

export type CampaignPersonalizeSender = {
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

export type CampaignPersonalizeMilestone = {
  anchor_date?: string | null;
  label?: string | null;
  type?: string | null;
  years?: number | null;
};

export type PersonalizeCampaignCardInput = {
  designConfig: DesignConfig;
  occasionSlug?: string | null;
  occasionName?: string | null;
  messageTemplateOverride?: string | OccasionMessageOverride | null;
  customer: CampaignPersonalizeCustomer;
  sender?: CampaignPersonalizeSender | null;
  milestone?: CampaignPersonalizeMilestone | null;
  campaignName?: string | null;
  baseFieldValues?: GreetingCardFieldValues;
  asOf?: Date;
};

export type PersonalizeCampaignCardResult = {
  fieldValues: GreetingCardFieldValues;
  greeting: string;
  message: string;
  footer: string;
  placeholderContext: PlaceholderContext;
};

function toOverride(
  raw: string | OccasionMessageOverride | null | undefined
): OccasionMessageOverride | null {
  if (!raw) return null;
  if (typeof raw === "string") return parseMessageOverride(raw);
  return raw;
}

export function personalizeCampaignCard(
  input: PersonalizeCampaignCardInput
): PersonalizeCampaignCardResult {
  assertMasterDesignUsable(input.designConfig);

  const years =
    input.milestone?.years != null
      ? input.milestone.years
      : input.milestone?.anchor_date
        ? computeMilestoneYears(input.milestone.anchor_date, input.asOf)
        : null;

  const context: PlaceholderContext = {
    customer: {
      firstName: input.customer.first_name,
      lastName: input.customer.last_name,
    },
    milestone: {
      years,
      date: input.milestone?.anchor_date ?? null,
      label: input.milestone?.label ?? null,
      type: input.milestone?.type ?? null,
    },
    occasion: {
      name: input.occasionName ?? null,
      slug: input.occasionSlug ?? null,
    },
    sender: {
      firstName: input.sender?.first_name ?? null,
      lastName: input.sender?.last_name ?? null,
      title: input.sender?.title ?? null,
    },
    campaign: {
      name: input.campaignName ?? null,
    },
  };

  const copy = resolveOccasionCopy({
    occasionSlug: input.occasionSlug,
    override: toOverride(input.messageTemplateOverride),
    context,
  });

  const sender = input.sender;
  const base: GreetingCardFieldValues = {
    ...(input.baseFieldValues ?? {}),
  };

  if (sender) {
    const senderName = [sender.first_name, sender.last_name]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(" ");
    if (senderName) base.sender_name = senderName;
    if (sender.title?.trim()) base.sender_title = sender.title.trim();
    if (sender.phone?.trim()) base.phone = sender.phone.trim();
    if (sender.email?.trim()) base.email_address = sender.email.trim();
    if (sender.website?.trim()) base.website = sender.website.trim();
  }

  const recipientDisplayName = [input.customer.first_name, input.customer.last_name]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ");

  const fieldValues = mapCopyToFieldValues({
    designConfig: input.designConfig,
    greeting: copy.greeting,
    message: copy.message,
    footer: copy.footer,
    recipientDisplayName,
    recipientFirstName: input.customer.first_name,
    base,
  });

  return {
    fieldValues,
    greeting: copy.greeting,
    message: copy.message,
    footer: copy.footer,
    placeholderContext: context,
  };
}
