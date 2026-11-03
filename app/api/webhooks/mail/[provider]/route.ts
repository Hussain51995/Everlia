import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getMailProvider } from "@/lib/mail/factory";
import { shouldAdvanceCardStatus } from "@/lib/mail/status-map";

type Params = { params: { provider: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const slug = params.provider.toLowerCase();
    const { provider } = await getMailProvider(slug);
    const rawBody = await request.text();

    const result = await provider.handleWebhook(request.headers, rawBody);
    if (!result) {
      return apiSuccess({ ignored: true });
    }

    const admin = createAdminClient();
    const { data: transaction } = await admin
      .from("mail_transactions")
      .select("id, greeting_card_id, internal_status")
      .eq("provider_mail_id", result.providerMailId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!transaction) {
      return apiSuccess({ matched: false });
    }

    await admin
      .from("mail_transactions")
      .update({
        provider_status_raw: result.providerStatus,
        internal_status: result.internalStatus,
        response_payload: result.raw as Record<string, unknown>,
      })
      .eq("id", transaction.id);

    const { data: card } = await admin
      .from("greeting_cards")
      .select("id, status")
      .eq("id", transaction.greeting_card_id)
      .maybeSingle();

    if (
      card &&
      shouldAdvanceCardStatus(card.status, result.internalStatus)
    ) {
      await admin
        .from("greeting_cards")
        .update({ status: result.internalStatus })
        .eq("id", card.id);
    }

    if (card?.id) {
      const { data: mailing } = await admin
        .from("campaign_mailings")
        .select("id, status")
        .eq("greeting_card_id", card.id)
        .maybeSingle();

      if (mailing) {
        await admin
          .from("campaign_mailings")
          .update({
            last_provider_status: result.providerStatus,
            provider_mail_id: result.providerMailId,
          })
          .eq("id", mailing.id);
      }
    }

    return apiSuccess({
      matched: true,
      providerMailId: result.providerMailId,
      status: result.internalStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handling failed";
    console.error(`[mail-webhook/${params.provider}]`, message);
    return apiError(
      {
        code: "WEBHOOK_ERROR",
        message,
      },
      400
    );
  }
}
