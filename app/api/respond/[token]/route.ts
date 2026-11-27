import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { occasionLabelFromCategory } from "@/lib/cards/labels";
import { buildPropertyIntelligenceBootstrap } from "@/lib/property-intelligence/bootstrap/build-respond-bootstrap";
import { SupabasePropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { cardResponseSubmitSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import { shouldAdvanceCardStatus } from "@/lib/mail/status-map";
import type { PublicRespondPayload } from "@/lib/types/cards";

type Params = { params: { token: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const admin = createAdminClient();
    const { data: qr, error } = await admin
      .from("qr_tokens")
      .select(
        `
        id,
        token,
        scan_count,
        first_scanned_at,
        greeting_card:greeting_cards (
          id,
          status,
          field_values,
          organization_id,
          template:card_templates (
            name,
            category
          ),
          customer:customers (
            first_name,
            last_name,
            property_address,
            address_line1,
            city,
            province_or_state,
            postal_or_zip
          ),
          organization:organizations (
            name
          )
        )
      `
      )
      .eq("token", params.token)
      .maybeSingle();

    if (error) {
      return apiError({ code: "RESPOND_ERROR", message: error.message }, 500);
    }

    if (!qr || !qr.greeting_card) {
      return apiError(
        { code: "NOT_FOUND", message: "This response link is invalid" },
        404
      );
    }

    const rawCard = Array.isArray(qr.greeting_card)
      ? qr.greeting_card[0]
      : qr.greeting_card;

    if (!rawCard) {
      return apiError(
        { code: "NOT_FOUND", message: "This response link is invalid" },
        404
      );
    }

    const card = rawCard as unknown as {
      id: string;
      status: string;
      field_values: {
        customer_name?: string;
        sender_name?: string;
        sender_title?: string;
        personal_message?: string;
        profile_image?: string;
        phone?: string;
        email_address?: string;
        website?: string;
      };
      template?:
        | { name: string; category: string }
        | { name: string; category: string }[]
        | null;
      customer?:
        | {
            first_name: string;
            last_name: string;
            property_address?: string | null;
            address_line1?: string | null;
            city?: string | null;
            province_or_state?: string | null;
            postal_or_zip?: string | null;
          }
        | {
            first_name: string;
            last_name: string;
            property_address?: string | null;
            address_line1?: string | null;
            city?: string | null;
            province_or_state?: string | null;
            postal_or_zip?: string | null;
          }[]
        | null;
      organization?: { name: string } | { name: string }[] | null;
    };

    const template = Array.isArray(card.template)
      ? card.template[0]
      : card.template;
    const customer = Array.isArray(card.customer)
      ? card.customer[0]
      : card.customer;
    const organization = Array.isArray(card.organization)
      ? card.organization[0]
      : card.organization;

    let propertyIntelligence: PublicRespondPayload["propertyIntelligence"] =
      null;
    try {
      const settings = new SupabasePropertyIntelligenceSettingsRepository(admin);
      const config = await settings.getResolvedConfig();
      propertyIntelligence = buildPropertyIntelligenceBootstrap({
        qrTokenRowId: String(qr.id),
        customer: {
          property_address: customer?.property_address ?? null,
          address_line1: customer?.address_line1 ?? null,
          city: customer?.city ?? null,
          province_or_state: customer?.province_or_state ?? null,
          postal_or_zip: customer?.postal_or_zip ?? null,
        },
        config,
      });

      const ifNoneMatch = request.headers.get("if-none-match");
      if (
        ifNoneMatch &&
        propertyIntelligence.etag &&
        ifNoneMatch === propertyIntelligence.etag
      ) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: propertyIntelligence.etag,
            "Cache-Control": "private, no-store",
          },
        });
      }
    } catch {
      propertyIntelligence = null;
    }

    const now = new Date().toISOString();
    await admin
      .from("qr_tokens")
      .update({
        scan_count: (qr.scan_count ?? 0) + 1,
        first_scanned_at: qr.first_scanned_at ?? now,
      })
      .eq("id", qr.id);

    if (
      shouldAdvanceCardStatus(
        card.status as never,
        "qr_scanned"
      )
    ) {
      await admin
        .from("greeting_cards")
        .update({ status: "qr_scanned" })
        .eq("id", card.id);
    }

    const payload: PublicRespondPayload = {
      token: qr.token,
      customerFirstName:
        customer?.first_name ||
        card.field_values?.customer_name?.split(" ")[0] ||
        "there",
      senderName: card.field_values?.sender_name || "your friend",
      senderTitle: card.field_values?.sender_title?.trim() || null,
      profileImageUrl: card.field_values?.profile_image?.trim() || null,
      senderPhone: card.field_values?.phone?.trim() || null,
      senderEmail: card.field_values?.email_address?.trim() || null,
      senderWebsite: card.field_values?.website?.trim() || null,
      occasionLabel: occasionLabelFromCategory(template?.category),
      personalMessage: card.field_values?.personal_message ?? null,
      organizationName: organization?.name ?? null,
      propertyIntelligence,
    };

    return apiSuccess(
      { respond: payload },
      {
        headers: {
          ...(propertyIntelligence?.etag
            ? { ETag: propertyIntelligence.etag }
            : {}),
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load response page",
      },
      500
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const parsed = cardResponseSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid response")
      );
    }

    if (
      parsed.data.response_type === "message" &&
      !parsed.data.message?.trim()
    ) {
      return validationError("Please enter a message");
    }

    const admin = createAdminClient();
    const { data: qr, error } = await admin
      .from("qr_tokens")
      .select("id, greeting_card_id, greeting_card:greeting_cards(id, status)")
      .eq("token", params.token)
      .maybeSingle();

    if (error) {
      return apiError({ code: "RESPOND_ERROR", message: error.message }, 500);
    }

    if (!qr) {
      return apiError(
        { code: "NOT_FOUND", message: "This response link is invalid" },
        404
      );
    }

    const { data: response, error: insertError } = await admin
      .from("card_responses")
      .insert({
        greeting_card_id: qr.greeting_card_id,
        qr_token_id: qr.id,
        response_type: parsed.data.response_type,
        message: parsed.data.message?.trim() || null,
      })
      .select("*")
      .single();

    if (insertError) {
      return apiError(
        { code: "RESPONSE_CREATE_ERROR", message: insertError.message },
        500
      );
    }

    await admin
      .from("greeting_cards")
      .update({ status: "response_received" })
      .eq("id", qr.greeting_card_id);

    return apiSuccess({ response });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to submit response",
      },
      500
    );
  }
}
