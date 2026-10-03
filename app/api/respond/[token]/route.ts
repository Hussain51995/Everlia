import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { occasionLabelFromCategory } from "@/lib/cards/labels";
import { cardResponseSubmitSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import { shouldAdvanceCardStatus } from "@/lib/mail/status-map";
import type { PublicRespondPayload } from "@/lib/types/cards";

type Params = { params: { token: string } };

export async function GET(_request: Request, { params }: Params) {
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
            last_name
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
        personal_message?: string;
      };
      template?:
        | { name: string; category: string }
        | { name: string; category: string }[]
        | null;
      customer?:
        | { first_name: string; last_name: string }
        | { first_name: string; last_name: string }[]
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
      occasionLabel: occasionLabelFromCategory(template?.category),
      personalMessage: card.field_values?.personal_message ?? null,
      organizationName: organization?.name ?? null,
    };

    return apiSuccess({ respond: payload });
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
