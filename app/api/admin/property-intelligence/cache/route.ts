import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { isNegativePayload } from "@/lib/property-intelligence/cache/freshness";
import { createPropertyIntelligenceCacheStack } from "@/lib/property-intelligence/service/factory";
import { propertyIntelligenceCacheSearchSchema } from "@/lib/validations/property-intelligence";
import { firstZodError } from "@/lib/validations/errors";

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const parsed = propertyIntelligenceCacheSearchSchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid cache search")
      );
    }

    const { cache } = createPropertyIntelligenceCacheStack();
    const limit = parsed.data.limit ?? 50;
    const rows = parsed.data.q?.trim()
      ? await cache.searchByIdentityKeyPrefix(parsed.data.q.trim(), limit)
      : await cache.listRecent(limit);

    const now = Date.now();
    const entries = rows.map((row) => {
      const expiresMs = Date.parse(row.expiresAt);
      const fresh =
        row.status === "active" &&
        Number.isFinite(expiresMs) &&
        expiresMs > now;
      return {
        id: row.id,
        cacheKey: row.cacheKey,
        providerId: row.providerId,
        providerDataset: row.providerDataset,
        category: row.category,
        normalizedIdentityKey: row.normalizedIdentityKey,
        schemaVersion: row.schemaVersion,
        accessScope: row.accessScope,
        status: row.status,
        fetchedAt: row.fetchedAt,
        expiresAt: row.expiresAt,
        sourceDataAt: row.sourceDataAt,
        invalidatedAt: row.invalidatedAt,
        updatedAt: row.updatedAt,
        isFresh: fresh,
        isNegative: isNegativePayload(row.payload),
      };
    });

    return apiSuccess({
      entries,
      count: entries.length,
      note: "Redis L2 metadata only. Invalidation does not trigger paid provider requests. Payloads are omitted from this list.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to search property cache",
      },
      500
    );
  }
}
