import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { pingRedisStatus } from "@/lib/property-intelligence/admin/redis-status";

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const status = await pingRedisStatus();
    return apiSuccess({
      redis: status,
      note: "Live ping result. Credentials are never returned.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to check Redis status",
      },
      500
    );
  }
}
