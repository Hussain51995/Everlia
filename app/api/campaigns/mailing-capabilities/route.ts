import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { isCampaignLiveMailEnabled } from "@/lib/mail/mode-guard";

export async function GET() {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const liveMailEnabled = isCampaignLiveMailEnabled();

    return apiSuccess({
      liveMailEnabled,
      workerModes: liveMailEnabled ? (["test", "live"] as const) : (["test"] as const),
      note: liveMailEnabled
        ? "Live campaign mailing is enabled. Real PostGrid live postage may be incurred."
        : "Live campaign mailing is disabled. Set CAMPAIGN_LIVE_MAIL_ENABLED=true and POSTGRID_MODE=live.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load mailing capabilities",
      },
      500
    );
  }
}
