import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listAdminProviderCatalog,
  providerSupportsCategory,
} from "@/lib/property-intelligence/admin/provider-catalog";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import { resolveProviderMonthlyBudget } from "@/lib/property-intelligence/execution/budget-config";
import { SupabasePropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import {
  propertyIntelligenceCategorySettingsPatchSchema,
  propertyIntelligenceGlobalSettingsPatchSchema,
} from "@/lib/validations/property-intelligence";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

const patchSchema = z.object({
  global: propertyIntelligenceGlobalSettingsPatchSchema.optional(),
  category: propertyIntelligenceCategorySettingsPatchSchema.optional(),
});

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
      note: "API credentials are never returned. Live provider enablement remains separately gated.",
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

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid settings patch")
      );
    }

    if (!parsed.data.global && !parsed.data.category) {
      return validationError("Provide global and/or category updates");
    }

    const admin = createAdminClient();
    const repo = new SupabasePropertyIntelligenceSettingsRepository(admin);

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
      const database = cat.databaseTtlSeconds ?? current.databaseTtlSeconds;
      if (browser > database) {
        return validationError("Browser TTL must not exceed database TTL");
      }

      const provider = catalog.find((p) => p.id === providerId);
      const capability = provider?.capabilities.find(
        (c) => c.category === (cat.category as PropertyDataCategory)
      );
      if (
        capability?.maxDatabaseTtlSeconds != null &&
        database > capability.maxDatabaseTtlSeconds
      ) {
        return validationError(
          `Database TTL exceeds provider retention limit (${capability.maxDatabaseTtlSeconds}s)`
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
      note: "Configuration versions updated. Cache validity will reconcile on next read; no provider requests were triggered.",
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
