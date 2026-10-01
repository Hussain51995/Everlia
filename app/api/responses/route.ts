import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import type { CardResponse } from "@/lib/types/cards";

export async function GET() {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();

    const { data: cards, error: cardsError } = await supabase
      .from("greeting_cards")
      .select("id")
      .eq("organization_id", ctx.organizationId);

    if (cardsError) {
      return apiError(
        { code: "RESPONSES_ERROR", message: cardsError.message },
        500
      );
    }

    const cardIds = (cards ?? []).map((c) => c.id);
    if (!cardIds.length) {
      return apiSuccess({ responses: [] });
    }

    const { data, error } = await supabase
      .from("card_responses")
      .select(
        `
        *,
        greeting_card:greeting_cards (
          id,
          status,
          template_id,
          customer_id,
          field_values,
          template:card_templates (
            id,
            name,
            category
          ),
          customer:customers (
            id,
            first_name,
            last_name
          )
        )
      `
      )
      .in("greeting_card_id", cardIds)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(
        { code: "RESPONSES_ERROR", message: error.message },
        500
      );
    }

    const responses = ((data ?? []) as Array<
      CardResponse & {
        greeting_card?: {
          customer?: CardResponse["customer"];
          template?: { id: string; name: string; category: string } | null;
        } | null;
      }
    >).map((row) => ({
      ...row,
      customer: row.greeting_card?.customer ?? null,
    }));

    return apiSuccess({ responses });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load responses",
      },
      500
    );
  }
}
