import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabasePropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import { propertyIntelligenceCacheInvalidateSchema } from "@/lib/validations/property-intelligence";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON body");
    }

    const parsed = propertyIntelligenceCacheInvalidateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid invalidation request")
      );
    }

    const admin = createAdminClient();
    const service = createCacheInvalidationService(
      new SupabasePropertyCacheRepository(admin)
    );
    const result = await service.invalidate(parsed.data);

    return apiSuccess({
      invalidation: result,
      note: "Cache entries invalidated. Fresh data will load on the next eligible request only.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Cache invalidation failed",
      },
      500
    );
  }
}
