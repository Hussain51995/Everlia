import { createAdminClient } from "@/lib/supabase/admin";
import { getMailProvider, resolveProviderId } from "@/lib/mail/factory";
import { resolvePostcardPdfUrl } from "@/lib/artwork/export";
import {
  assertCampaignMailingModeAllowed,
  assertTestProviderEnvironment,
} from "@/lib/mail/mode-guard";
import type { CampaignMailingMode } from "@/lib/types/campaigns";
import type { GreetingCard, OrganizationBranding } from "@/lib/types/cards";

export type SubmitCardMailInput = {
  cardId: string;
  organizationId: string;
  campaignMailingMode?: CampaignMailingMode;
  sender?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  };
  orgName?: string | null;
  testLabel?: boolean;
};

export type SubmitCardMailResult = {
  card: GreetingCard;
  mailTransactionId: string;
  provider: string;
  providerMailId: string;
  providerStatus: string;
  environment: string;
  simulated: boolean;
};

export async function submitCardMail(
  input: SubmitCardMailInput
): Promise<SubmitCardMailResult> {
  if (input.campaignMailingMode) {
    assertCampaignMailingModeAllowed(input.campaignMailingMode);
  }

  const admin = createAdminClient();
  const { data: card, error } = await admin
    .from("greeting_cards")
    .select(
      `
      *,
      customer:customers (*)
    `
    )
    .eq("id", input.cardId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!card) throw new Error("Card not found");

  if (card.status !== "ready_to_send") {
    throw new Error("Generate artwork before sending this card");
  }
  if (!card.front_artwork_url || !card.back_artwork_url) {
    throw new Error("Card artwork is missing");
  }

  const customer = card.customer as {
    first_name: string;
    last_name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    province_or_state: string;
    postal_or_zip: string;
    country_code: string;
  } | null;

  if (!customer) throw new Error("Customer is missing");

  const { data: branding } = await admin
    .from("organization_branding")
    .select("*")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  const brand = branding as OrganizationBranding | null;
  const orgName = input.orgName?.trim() || "Everlia";
  const fieldSender = (card.field_values as { sender_name?: string })
    ?.sender_name;
  const senderFirst =
    input.sender?.firstName ||
    fieldSender?.split(" ")[0] ||
    "Team";
  const senderLast =
    input.sender?.lastName ||
    fieldSender?.split(" ").slice(1).join(" ") ||
    orgName;

  const fromAddress = {
    firstName: senderFirst,
    lastName: senderLast || orgName,
    companyName:
      input.sender?.companyName || brand?.sender_display_name || orgName,
    addressLine1:
      brand?.return_address_line1 || customer.address_line1 || "1 Main St",
    addressLine2: brand?.return_address_line2 || undefined,
    city: brand?.return_city || customer.city || "New York",
    provinceOrState:
      brand?.return_province_or_state || customer.province_or_state || "NY",
    postalOrZip: brand?.return_postal_or_zip || customer.postal_or_zip || "10001",
    countryCode: brand?.return_country_code || "US",
  };

  const { provider, providerId, environment } = await getMailProvider();

  if (input.campaignMailingMode === "test") {
    assertTestProviderEnvironment(environment);
  }

  let resolvedProviderId = providerId;
  if (!resolvedProviderId) {
    resolvedProviderId = await resolveProviderId(provider.slug);
  }
  if (!resolvedProviderId) {
    throw new Error("Mail provider is not configured in the database");
  }

  const pdfUrl = resolvePostcardPdfUrl(card.front_artwork_url);
  const simulated =
    input.campaignMailingMode === "test" || environment !== "live";

  const sendResult = await provider.sendCard({
    pdfUrl,
    to: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      addressLine1: customer.address_line1,
      addressLine2: customer.address_line2 || undefined,
      city: customer.city,
      provinceOrState: customer.province_or_state,
      postalOrZip: customer.postal_or_zip,
      countryCode: customer.country_code || "US",
    },
    from: fromAddress,
    size: "6x4",
    description: simulated
      ? `[TEST] Greeting card ${card.id}`
      : `Greeting card ${card.id}`,
    metadata: {
      greeting_card_id: card.id,
      organization_id: input.organizationId,
      environment,
      campaign_mailing_mode: input.campaignMailingMode ?? "",
      simulated: simulated ? "true" : "false",
      test_label: simulated ? "true" : "false",
    },
  });

  const { data: tx, error: txError } = await admin
    .from("mail_transactions")
    .insert({
      greeting_card_id: card.id,
      provider_id: resolvedProviderId,
      provider_mail_id: sendResult.providerMailId,
      internal_status: "submitted",
      provider_status_raw: simulated
        ? `test:${sendResult.providerStatus}`
        : sendResult.providerStatus,
      request_payload: {
        pdfUrl,
        frontUrl: card.front_artwork_url,
        backUrl: card.back_artwork_url,
        environment,
        simulated,
      },
      response_payload: sendResult.raw as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (txError || !tx) {
    throw new Error(txError?.message ?? "Failed to record mail transaction");
  }

  const { data: updated, error: updateError } = await admin
    .from("greeting_cards")
    .update({
      status: "submitted",
      sent_at: new Date().toISOString(),
    })
    .eq("id", card.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Failed to update card status");
  }

  return {
    card: updated as GreetingCard,
    mailTransactionId: tx.id,
    provider: provider.slug,
    providerMailId: sendResult.providerMailId,
    providerStatus: simulated
      ? `test:${sendResult.providerStatus}`
      : sendResult.providerStatus,
    environment,
    simulated,
  };
}
