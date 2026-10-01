import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import type { GreetingCard, MailTransaction } from "@/lib/types/cards";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
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
        customer:customers (id, first_name, last_name)
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

    const { data: transactions } = await supabase
      .from("mail_transactions")
      .select("*")
      .eq("greeting_card_id", card.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return apiSuccess({
      card: card as GreetingCard,
      latestTransaction: (transactions?.[0] as MailTransaction | undefined) ?? null,
      transactions: (transactions ?? []) as MailTransaction[],
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load status",
      },
      500
    );
  }
}
