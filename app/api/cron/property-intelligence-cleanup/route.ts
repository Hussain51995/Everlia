import { apiError, apiSuccess } from "@/lib/api/response";
import { createCacheCleanupService } from "@/lib/property-intelligence/cache/cleanup";
import { SupabasePropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { SupabasePropertyFetchLockRepository } from "@/lib/property-intelligence/cache/fetch-locks";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const batchSize = Number(url.searchParams.get("batchSize") ?? "100");

    const admin = createAdminClient();
    const cleanup = createCacheCleanupService({
      cacheRepo: new SupabasePropertyCacheRepository(admin),
      lockRepo: new SupabasePropertyFetchLockRepository(admin),
      config: {
        batchSize: Number.isFinite(batchSize) ? batchSize : 100,
      },
    });

    const report = await cleanup.run();

    return apiSuccess({
      ...report,
      note: "Property Intelligence cache cleanup completed. No provider API calls were made.",
    });
  } catch (error) {
    console.error("[cron/property-intelligence-cleanup]", error);
    return apiError(
      {
        code: "WORKER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Property Intelligence cleanup failed",
      },
      500
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
