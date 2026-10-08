import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { greetingCardUpdateSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import { getAppUrl } from "@/lib/app-url";
import type { GreetingCard } from "@/lib/types/cards";

type Params = { params: { id: string } };

function respondUrlForToken(token: string | null | undefined) {
  if (!token) return null;
  return `${getAppUrl()}/respond/${token}`;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data, error } = await supabase
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

    if (!data) {
      return apiError({ code: "NOT_FOUND", message: "Card not found" }, 404);
    }

    const admin = createAdminClient();
    const { data: qr } = await admin
      .from("qr_tokens")
      .select("token")
      .eq("greeting_card_id", data.id)
      .maybeSingle();

    const qrToken = qr?.token ?? null;

    return apiSuccess({
      card: data as GreetingCard,
      qrToken,
      respondUrl: respondUrlForToken(qrToken),
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load card",
      },
      500
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json();
    const parsed = greetingCardUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid greeting card data")
      );
    }

    const supabase = createClient();

    const { data: existing } = await supabase
      .from("greeting_cards")
      .select("id, status")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (!existing) {
      return apiError({ code: "NOT_FOUND", message: "Card not found" }, 404);
    }

    if (!["draft", "ready_to_send"].includes(existing.status)) {
      return apiError(
        {
          code: "CARD_LOCKED",
          message: "This card can no longer be edited",
        },
        400
      );
    }

    if (parsed.data.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("id", parsed.data.customer_id)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();

      if (!customer) {
        return apiError(
          { code: "INVALID_CUSTOMER", message: "Customer not found" },
          400
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.customer_id) updates.customer_id = parsed.data.customer_id;
    if (parsed.data.field_values) {
      updates.field_values = parsed.data.field_values;
      updates.status = "draft";
      updates.front_artwork_url = null;
      updates.back_artwork_url = null;
    }

    const { data, error } = await supabase
      .from("greeting_cards")
      .update(updates)
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .select(
        `
        *,
        template:card_templates (*),
        customer:customers (*)
      `
      )
      .single();

    if (error) {
      return apiError(
        { code: "CARD_UPDATE_ERROR", message: error.message },
        500
      );
    }

    return apiSuccess({ card: data as GreetingCard });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update card",
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data: existing, error: lookupError } = await supabase
      .from("greeting_cards")
      .select("id, status")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (lookupError) {
      return apiError(
        { code: "CARD_ERROR", message: lookupError.message },
        500
      );
    }

    if (!existing) {
      return apiError({ code: "NOT_FOUND", message: "Card not found" }, 404);
    }

    if (!["draft", "ready_to_send"].includes(existing.status)) {
      return apiError(
        {
          code: "CARD_LOCKED",
          message: "Only unsent cards can be deleted",
        },
        400
      );
    }

    const { data, error } = await supabase
      .from("greeting_cards")
      .delete()
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .select("id")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "CARD_DELETE_ERROR", message: error.message },
        500
      );
    }

    if (!data) {
      return apiError({ code: "NOT_FOUND", message: "Card not found" }, 404);
    }

    return apiSuccess({ deleted: true, id: data.id });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete card",
      },
      500
    );
  }
}
