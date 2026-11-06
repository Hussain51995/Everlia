
import type { DesignConfig, DesignField, GreetingCardFieldValues } from "@/lib/types/cards";

export const CAMPAIGN_DYNAMIC_FIELD_KEYS = [
  "occasion_heading",
  "customer_name",
  "personal_message",
  "footer_note",
  "sender_name",
  "sender_title",
  "phone",
  "email_address",
  "website",
  "company_logo",
  "profile_image",
  "qr_code",
] as const;

export type CampaignDynamicFieldKey =
  (typeof CAMPAIGN_DYNAMIC_FIELD_KEYS)[number];

export type MasterDesignFieldMap = {
  hasOccasionHeading: boolean;
  hasCustomerName: boolean;
  hasPersonalMessage: boolean;
  hasFooterNote: boolean;
  textKeys: string[];
};

export function collectDesignFields(config: DesignConfig): DesignField[] {
  return [...(config.front?.fields ?? []), ...(config.back?.fields ?? [])];
}

export function analyzeMasterDesign(config: DesignConfig): MasterDesignFieldMap {
  const fields = collectDesignFields(config);
  const textKeys = fields.filter((f) => f.type === "text").map((f) => f.key);
  const keySet = new Set(textKeys);
  return {
    hasOccasionHeading: keySet.has("occasion_heading"),
    hasCustomerName: keySet.has("customer_name"),
    hasPersonalMessage: keySet.has("personal_message"),
    hasFooterNote: keySet.has("footer_note"),
    textKeys,
  };
}

export function formatDearCustomerName(
  firstName?: string | null,
  displayName?: string | null
): string {
  const fromFirst = firstName?.trim();
  if (fromFirst) return `Dear ${fromFirst}`;

  const fromDisplay = displayName?.trim().split(/\s+/).filter(Boolean)[0];
  if (fromDisplay) return `Dear ${fromDisplay}`;

  return "Dear Friend";
}

export function mapCopyToFieldValues(options: {
  designConfig: DesignConfig;
  greeting: string;
  message: string;
  footer: string;
  recipientDisplayName?: string;
  recipientFirstName?: string;
  base?: GreetingCardFieldValues;
}): GreetingCardFieldValues {
  const map = analyzeMasterDesign(options.designConfig);
  const values: GreetingCardFieldValues = { ...(options.base ?? {}) };

  if (map.hasOccasionHeading) {
    values.occasion_heading = options.greeting;
    if (map.hasCustomerName) {
      values.customer_name = formatDearCustomerName(
        options.recipientFirstName,
        options.recipientDisplayName
      );
    }
  } else if (map.hasCustomerName) {
    values.customer_name = options.greeting;
  }

  if (map.hasPersonalMessage) {
    values.personal_message = options.message;
  }

  if (map.hasFooterNote && options.footer) {
    values.footer_note = options.footer;
  }

  return values;
}

export function isMasterDesignUsable(config: DesignConfig): boolean {
  const map = analyzeMasterDesign(config);
  return (
    map.hasCustomerName || map.hasOccasionHeading || map.hasPersonalMessage
  );
}

export function assertMasterDesignUsable(config: DesignConfig): void {
  if (!isMasterDesignUsable(config)) {
    throw new Error(
      "Master design must expose at least one dynamic text region (customer_name, occasion_heading, or personal_message)"
    );
  }
}
