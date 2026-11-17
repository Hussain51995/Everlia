import { apiError, apiSuccess } from "@/lib/api/response";
import { runCampaignMailingWorker } from "@/lib/campaigns/mailing-executor";
import { isCampaignLiveMailEnabled } from "@/lib/mail/mode-guard";


export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return apiError(
        {
          code: "CRON_MISCONFIGURED",
          message: "CRON_SECRET is not configured",
        },
        500
      );
    }

    const auth = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const bearer =
      auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
    const provided = bearer || headerSecret;

    if (!provided || provided !== secret) {
      return apiError(
        { code: "UNAUTHORIZED", message: "Invalid cron credentials" },
        401
      );
    }

    const url = new URL(request.url);
    const batchSize = Number(url.searchParams.get("batchSize") ?? "10");
    const refresh =
      url.searchParams.get("refreshSchedules") !== "0";

    const result = await runCampaignMailingWorker({
      batchSize: Number.isFinite(batchSize) ? batchSize : 10,
      refreshSchedules: refresh,
    });

    const liveMailEnabled = isCampaignLiveMailEnabled();

    return apiSuccess({
      ...result,
      liveMailEnabled,
      note: liveMailEnabled
        ? "Worker submits due mailings for active test and live campaigns."
        : "Worker submits test-mode mailings only. Enable CAMPAIGN_LIVE_MAIL_ENABLED=true and POSTGRID_MODE=live for live postage.",
    });
  } catch (error) {
    console.error("[cron/campaign-mailings]", error);
    return apiError(
      {
        code: "WORKER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Campaign mailing worker failed",
      },
      500
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
