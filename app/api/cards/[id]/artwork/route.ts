import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { createQrToken } from "@/lib/cards/qr-token";
import {
  composePostcardArtwork,
  postcardPngsToPdf,
} from "@/lib/artwork/compose";
import { uploadCardArtwork } from "@/lib/artwork/export";
import type { DesignConfig, GreetingCard, GreetingCardFieldValues } from "@/lib/types/cards";

type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data: card, error } = await supabase
      .from("greeting_cards")
      .select(
        `
        *,
        template:card_templates (*),
        customer:customers (*)
      `
      )
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (error) {
      return apiError({ code: "CARD_ERROR", message: error.message }, 500);
    }

    if (!card) {
      return apiError({ code: "NOT_FOUND", message: "Card not found" }, 404);
    }

    if (!["draft", "ready_to_send"].includes(card.status)) {
      return apiError(
        {
          code: "CARD_LOCKED",
          message: "Artwork can only be generated for draft cards",
        },
        400
      );
    }

    const template = card.template as {
      front_background_url: string;
      back_background_url: string;
      design_config: DesignConfig;
    } | null;

    if (!template) {
      return apiError(
        { code: "TEMPLATE_MISSING", message: "Card template is missing" },
        400
      );
    }

    const fieldValues = (card.field_values ?? {}) as GreetingCardFieldValues;
    const customer = card.customer as {
      first_name: string;
      last_name: string;
    } | null;

    if (!fieldValues.customer_name && customer) {
      fieldValues.customer_name = `${customer.first_name} ${customer.last_name}`.trim();
    }

    if (!fieldValues.sender_name) {
      const profile = ctx.session.profile;
      fieldValues.sender_name =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        "Your friend";
    }

    const admin = createAdminClient();

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
      if (tokenError) {
        return apiError(
          { code: "QR_TOKEN_ERROR", message: tokenError.message },
          500
        );
      }
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
      organizationId: ctx.organizationId,
      cardId: card.id,
      frontPng,
      backPng,
      pdf,
    });

    const { data: updated, error: updateError } = await supabase
      .from("greeting_cards")
      .update({
        field_values: fieldValues,
        front_artwork_url: uploaded.frontUrl,
        back_artwork_url: uploaded.backUrl,
        status: "ready_to_send",
      })
      .eq("id", card.id)
      .select(
        `
        *,
        template:card_templates (*),
        customer:customers (*)
      `
      )
      .single();

    if (updateError) {
      return apiError(
        { code: "CARD_UPDATE_ERROR", message: updateError.message },
        500
      );
    }

    return apiSuccess({
      card: updated as GreetingCard,
      artwork: {
        frontUrl: uploaded.frontUrl,
        backUrl: uploaded.backUrl,
        pdfUrl: uploaded.pdfUrl,
      },
      qrToken,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate artwork",
      },
      500
    );
  }
}
