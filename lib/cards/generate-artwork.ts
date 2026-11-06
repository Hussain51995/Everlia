import { createAdminClient } from "@/lib/supabase/admin";
import { createQrToken } from "@/lib/cards/qr-token";
import {
  composePostcardArtwork,
  postcardPngsToPdf,
} from "@/lib/artwork/compose";
import { uploadCardArtwork } from "@/lib/artwork/export";
import { getAppUrl } from "@/lib/app-url";
import type {
  DesignConfig,
  GreetingCard,
  GreetingCardFieldValues,
} from "@/lib/types/cards";

export type GenerateCardArtworkResult = {
  card: GreetingCard;
  artwork: { frontUrl: string; backUrl: string; pdfUrl?: string };
  qrToken: string;
  respondUrl: string;
};

export async function generateCardArtwork(params: {
  cardId: string;
  organizationId: string;
  defaultSenderName?: string;
}): Promise<GenerateCardArtworkResult> {
  const admin = createAdminClient();

  const { data: card, error } = await admin
    .from("greeting_cards")
    .select(
      `
      *,
      template:card_templates (*),
      customer:customers (*)
    `
    )
    .eq("id", params.cardId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!card) throw new Error("Card not found");

  if (!["draft", "ready_to_send"].includes(card.status)) {
    throw new Error("Artwork can only be generated for draft cards");
  }

  const template = card.template as {
    front_background_url: string;
    back_background_url: string;
    design_config: DesignConfig;
  } | null;

  if (!template) throw new Error("Card template is missing");

  const fieldValues = {
    ...((card.field_values ?? {}) as GreetingCardFieldValues),
  };
  const customer = card.customer as {
    first_name: string;
    last_name: string;
  } | null;

  if (!fieldValues.customer_name && customer) {
    const first = customer.first_name?.trim();
    fieldValues.customer_name = first ? `Dear ${first}` : "Dear Friend";
  }
  if (!fieldValues.sender_name) {
    fieldValues.sender_name = params.defaultSenderName?.trim() || "Your friend";
  }

  const { data: existingToken } = await admin
    .from("qr_tokens")
    .select("id, token")
    .eq("greeting_card_id", card.id)
    .maybeSingle();

  let qrToken = existingToken?.token;
  if (!qrToken) {
    qrToken = createQrToken();
    const { error: tokenError } = await admin.from("qr_tokens").insert({
      token: qrToken,
      greeting_card_id: card.id,
    });
    if (tokenError) throw new Error(tokenError.message);
  }

  const { frontPng, backPng } = await composePostcardArtwork({
    designConfig: template.design_config,
    frontBackgroundUrl: template.front_background_url,
    backBackgroundUrl: template.back_background_url,
    fieldValues,
    qrToken,
  });

  const pdf = await postcardPngsToPdf(frontPng, backPng);
  const uploaded = await uploadCardArtwork({
    organizationId: params.organizationId,
    cardId: card.id,
    frontPng,
    backPng,
    pdf,
  });

  const { data: updated, error: updateError } = await admin
    .from("greeting_cards")
    .update({
      field_values: fieldValues,
      front_artwork_url: uploaded.frontUrl,
      back_artwork_url: uploaded.backUrl,
      status: "ready_to_send",
    })
    .eq("id", card.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Failed to save artwork");
  }

  return {
    card: updated as GreetingCard,
    artwork: {
      frontUrl: uploaded.frontUrl,
      backUrl: uploaded.backUrl,
      pdfUrl: uploaded.pdfUrl,
    },
    qrToken,
    respondUrl: `${getAppUrl()}/respond/${qrToken}`,
  };
}
