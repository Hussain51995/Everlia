import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { submitCardMail } from "@/lib/cards/submit-mail";

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
    const orgName = ctx.session.membership?.organization?.name ?? "Everlia";

    const result = await submitCardMail({
      cardId: params.id,
      organizationId: ctx.organizationId,
      sender: {
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        companyName: orgName,
      },
      orgName,
    });

    return apiSuccess({
      card: result.card,
      mail: {
        provider: result.provider,
        providerMailId: result.providerMailId,
        providerStatus: result.providerStatus,
        environment: result.environment,
        simulated: result.simulated,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send card";
    const code =
      message.toLowerCase().includes("artwork") ||
      message.toLowerCase().includes("ready")
        ? "NOT_READY"
        : "SERVER_ERROR";
    return apiError({ code, message }, code === "NOT_READY" ? 400 : 500);
  }
}
