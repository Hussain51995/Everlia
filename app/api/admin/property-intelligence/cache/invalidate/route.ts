import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import { createPropertyIntelligenceCacheStack } from "@/lib/property-intelligence/service/factory";
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

    const { settings, cache } = createPropertyIntelligenceCacheStack();
    const service = createCacheInvalidationService(cache);
    const result = await service.invalidate(parsed.data);

    let invalidationGeneration: number | undefined;
    if (settings.bumpConfigVersion) {
      invalidationGeneration = await settings.bumpConfigVersion();
    }

    return apiSuccess({
      invalidation: {
        ...result,
        invalidationGeneration,
      },
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
