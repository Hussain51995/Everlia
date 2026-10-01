import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { greetingCardCreateSchema } from "@/lib/validations/cards";
import { firstZodError } from "@/lib/validations/errors";
import type { GreetingCard } from "@/lib/types/cards";

export async function GET() {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("greeting_cards")
      .select(
        `
        *,
        template:card_templates (
          id,
          slug,
          name,
          category,
          preview_image_url
        ),
        customer:customers (
          id,
          first_name,
          last_name,
          city,
          province_or_state
        )
      `
      )
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError({ code: "CARDS_ERROR", message: error.message }, 500);
    }

    return apiSuccess({ cards: (data ?? []) as GreetingCard[] });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load cards",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json();
    const parsed = greetingCardCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid greeting card data")
      );
    }

    const supabase = createClient();

    const [{ data: template }, { data: customer }] = await Promise.all([
      supabase
        .from("card_templates")
        .select("id")
        .eq("id", parsed.data.template_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("customers")
        .select("id")
        .eq("id", parsed.data.customer_id)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle(),
    ]);

    if (!template) {
      return apiError(
        { code: "INVALID_TEMPLATE", message: "Template not found" },
        400
      );
    }

    if (!customer) {
      return apiError(
        { code: "INVALID_CUSTOMER", message: "Customer not found" },
        400
      );
    }

    const { data, error } = await supabase
      .from("greeting_cards")
      .insert({
        organization_id: ctx.organizationId,
        created_by: ctx.user.id,
        template_id: parsed.data.template_id,
        customer_id: parsed.data.customer_id,
        field_values: parsed.data.field_values ?? {},
        status: "draft",
      })
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
        { code: "CARD_CREATE_ERROR", message: error.message },
        500
      );
    }

    return apiSuccess({ card: data as GreetingCard });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to create card",
      },
      500
    );
  }
}
