import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listAdminProviderCatalog,
  providerSupportsCategory,
} from "@/lib/property-intelligence/admin/provider-catalog";
import { getRedisConfigStatus } from "@/lib/property-intelligence/admin/redis-status";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import { resolveProviderMonthlyBudget } from "@/lib/property-intelligence/execution/budget-config";
import { SupabasePropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import {
  BROWSER_TTL_ALLOWLIST,
  BROWSER_TTL_LABELS,
  DEFAULT_BROWSER_TTL_SECONDS,
  DEFAULT_REDIS_TTL_SECONDS,
  REDIS_TTL_ALLOWLIST,
  REDIS_TTL_LABELS,
} from "@/lib/property-intelligence/settings/ttl-policy";
import { propertyIntelligenceSettingsPatchSchema } from "@/lib/validations/property-intelligence";
import { firstZodError } from "@/lib/validations/errors";

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const admin = createAdminClient();
    const repo = new SupabasePropertyIntelligenceSettingsRepository(admin);
    const config = await repo.getResolvedConfig();
    const providers = listAdminProviderCatalog();

    return apiSuccess({
      settings: config,
      providers,
      envBudgetDefault: resolveProviderMonthlyBudget({
        settingsBudget: config.global.monthlyApiBudget,
      }),
      redis: getRedisConfigStatus(),
      ttlPolicy: {
        browserAllowlist: BROWSER_TTL_ALLOWLIST,
        browserLabels: BROWSER_TTL_LABELS,
        browserDefaults: DEFAULT_BROWSER_TTL_SECONDS,
        redisAllowlist: REDIS_TTL_ALLOWLIST,
        redisLabels: REDIS_TTL_LABELS,
        redisDefaults: DEFAULT_REDIS_TTL_SECONDS,
      },
      note: "API credentials are never returned. Live provider enablement remains separately gated. Redis status here is configuration-only.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Property Intelligence settings",
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON body");
    }

    const parsed = propertyIntelligenceSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid settings patch")
      );
    }

    if (
      !parsed.data.global &&
      !parsed.data.category &&
      !parsed.data.restoreDefaults
    ) {
      return validationError(
        "Provide global, category, and/or restoreDefaults updates"
      );
    }

    const admin = createAdminClient();
    const repo = new SupabasePropertyIntelligenceSettingsRepository(admin);

    if (parsed.data.restoreDefaults) {
      await repo.restoreRecommendedDefaults();
      const config = await repo.getResolvedConfig();
      return apiSuccess({
        settings: config,
        note: "Recommended browser and Redis TTL defaults restored. Config versions updated. No provider requests were triggered.",
      });
    }

    if (parsed.data.category) {
      const cat = parsed.data.category;
      const catalog = listAdminProviderCatalog();
      const current = (await repo.getResolvedConfig()).categories[cat.category];
      const providerId = cat.providerId ?? current.providerId;

      if (!providerSupportsCategory(providerId, cat.category, catalog)) {
        return validationError(
          `Provider "${providerId}" does not support ${cat.category}`
        );
      }

      const browser = cat.browserTtlSeconds ?? current.browserTtlSeconds;
      const redisTtl = cat.redisTtlSeconds ?? current.redisTtlSeconds;
      if (browser > redisTtl) {
        return validationError("Browser TTL must not exceed Redis TTL");
      }

      const provider = catalog.find((p) => p.id === providerId);
      const capability = provider?.capabilities.find(
        (c) => c.category === (cat.category as PropertyDataCategory)
      );
      if (
        capability?.maxRedisTtlSeconds != null &&
        redisTtl > capability.maxRedisTtlSeconds
      ) {
        return validationError(
          `Redis TTL exceeds provider retention limit (${capability.maxRedisTtlSeconds}s). Choose a shorter duration or a different provider.`
        );
      }

      await repo.updateCategory(cat.category, cat);
    }

    if (parsed.data.global) {
      const catalog = listAdminProviderCatalog();
      if (parsed.data.global.defaultProviderId) {
        const provider = catalog.find(
          (p) => p.id === parsed.data.global!.defaultProviderId
        );
        if (!provider?.selectable) {
          return validationError(
            `Provider "${parsed.data.global.defaultProviderId}" is not selectable`
          );
        }
      }
      await repo.updateGlobal(parsed.data.global, auth.user.id);
    }

    const config = await repo.getResolvedConfig();
    return apiSuccess({
      settings: config,
      note: "Configuration versions updated. Cache validity reconciles from original fetch timestamps on next read; no provider requests were triggered.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update settings";
    if (
      message.includes("TTL") ||
      message.includes("monthlyApiBudget") ||
      message.includes("must be")
    ) {
      return validationError(message);
    }
    return apiError({ code: "SERVER_ERROR", message }, 500);
  }
}
