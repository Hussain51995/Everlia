import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { getMailProvider, resolveProviderId } from "@/lib/mail/factory";
import { resolvePublicAssetUrl } from "@/lib/artwork/export";
import type { GreetingCard, OrganizationBranding } from "@/lib/types/cards";

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
        template:card_templates (id, name, category),
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

    if (card.status !== "ready_to_send") {
      return apiError(
        {
          code: "NOT_READY",
          message: "Generate artwork before sending this card",
        },
        400
      );
    }

    if (!card.front_artwork_url || !card.back_artwork_url) {
      return apiError(
        {
          code: "ARTWORK_MISSING",
          message: "Card artwork is missing",
        },
        400
      );
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

    if (!customer) {
      return apiError(
        { code: "CUSTOMER_MISSING", message: "Customer is missing" },
        400
      );
    }

    const { data: branding } = await supabase
      .from("organization_branding")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    const brand = branding as OrganizationBranding | null;
    const profile = ctx.session.profile;
    const orgName =
      ctx.session.membership?.organization?.name ?? "Everlia";
    const senderFirst =
      profile?.first_name ||
      (card.field_values as { sender_name?: string })?.sender_name?.split(
        " "
      )[0] ||
      "Team";
    const senderLast =
      profile?.last_name ||
      (card.field_values as { sender_name?: string })?.sender_name
        ?.split(" ")
        .slice(1)
        .join(" ") ||
      orgName;

    const fromAddress = {
      firstName: senderFirst,
      lastName: senderLast || orgName,
      companyName: brand?.sender_display_name || orgName,
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
    let resolvedProviderId = providerId;
    if (!resolvedProviderId) {
      resolvedProviderId = await resolveProviderId(provider.slug);
    }

    if (!resolvedProviderId) {
      return apiError(
        {
          code: "PROVIDER_MISSING",
          message: "Mail provider is not configured in the database",
        },
        500
      );
    }

    const sendResult = await provider.sendCard({
      frontUrl: resolvePublicAssetUrl(card.front_artwork_url),
      backUrl: resolvePublicAssetUrl(card.back_artwork_url),
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
      description: `Greeting card ${card.id}`,
      metadata: {
        greeting_card_id: card.id,
        organization_id: ctx.organizationId,
        environment,
      },
    });

    const admin = createAdminClient();
    const { error: txError } = await admin.from("mail_transactions").insert({
      greeting_card_id: card.id,
      provider_id: resolvedProviderId,
      provider_mail_id: sendResult.providerMailId,
      internal_status: "submitted",
      provider_status_raw: sendResult.providerStatus,
      request_payload: {
        frontUrl: card.front_artwork_url,
        backUrl: card.back_artwork_url,
        environment,
      },
      response_payload: sendResult.raw as Record<string, unknown>,
    });

    if (txError) {
      return apiError(
        { code: "TRANSACTION_ERROR", message: txError.message },
        500
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("greeting_cards")
      .update({
        status: "submitted",
        sent_at: new Date().toISOString(),
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
      mail: {
        provider: provider.slug,
        providerMailId: sendResult.providerMailId,
        providerStatus: sendResult.providerStatus,
      },
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to send card",
      },
      500
    );
  }
}
