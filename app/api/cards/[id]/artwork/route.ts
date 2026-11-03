import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { generateCardArtwork } from "@/lib/cards/generate-artwork";

type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data: card, error } = await supabase
      .from("greeting_cards")
      .select("id")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (error) {
      return apiError({ code: "CARD_ERROR", message: error.message }, 500);
    }
    if (!card) {
      return apiError({ code: "NOT_FOUND", message: "Card not found" }, 404);
    }

    const profile = ctx.session.profile;
    const defaultSenderName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      "Your friend";

    const result = await generateCardArtwork({
      cardId: params.id,
      organizationId: ctx.organizationId,
      defaultSenderName,
    });

    return apiSuccess({
      card: result.card,
      artwork: result.artwork,
      qrToken: result.qrToken,
      respondUrl: result.respondUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate artwork";
    const status = message.toLowerCase().includes("locked") ||
      message.toLowerCase().includes("only be generated")
      ? 400
      : 500;
    return apiError(
      {
        code: status === 400 ? "CARD_LOCKED" : "SERVER_ERROR",
        message,
      },
      status
    );
  }
}
