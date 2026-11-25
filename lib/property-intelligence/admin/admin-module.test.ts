import { describe, expect, it } from "vitest";
import {
  listAdminProviderCatalog,
  providerSupportsCategory,
} from "@/lib/property-intelligence/admin/provider-catalog";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { MemoryPropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import {
  propertyIntelligenceCategorySettingsPatchSchema,
  propertyIntelligenceGlobalSettingsPatchSchema,
  propertyIntelligenceCacheInvalidateSchema,
} from "@/lib/validations/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

describe("Property Intelligence admin — provider catalog", () => {
  it("lists only registered adapters and never includes secrets", () => {
    const catalog = listAdminProviderCatalog({
      RENTCAST_API_KEY: "super-secret-key",
    } as unknown as NodeJS.ProcessEnv);

    expect(catalog.map((p) => p.id)).toEqual([
      "rentcast",
      "mock",
      "altavista",
    ]);
    const json = JSON.stringify(catalog);
    expect(json).not.toContain("super-secret-key");
    expect(catalog.find((p) => p.id === "rentcast")?.configured).toBe(true);
    expect(catalog.find((p) => p.id === "mock")?.isMock).toBe(true);
    expect(catalog.find((p) => p.id === "altavista")?.isMock).toBe(true);
  });

  it("marks RentCast unconfigured without fabricating availability", () => {
    const catalog = listAdminProviderCatalog({} as unknown as NodeJS.ProcessEnv);
    const rentcast = catalog.find((p) => p.id === "rentcast");
    expect(rentcast?.configured).toBe(false);
    expect(rentcast?.selectable).toBe(true);
  });

  it("rejects unsupported provider/category combinations", () => {
    expect(providerSupportsCategory("rentcast", "property_details")).toBe(true);
    expect(providerSupportsCategory("unimplemented", "property_details")).toBe(
      false
    );
  });
});

describe("Property Intelligence admin — settings validation", () => {
  it("accepts valid global patches", () => {
    const parsed = propertyIntelligenceGlobalSettingsPatchSchema.safeParse({
      featureEnabled: true,
      browserCachingEnabled: false,
      monthlyApiBudget: 250,
      defaultProviderId: "mock",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects negative budget", () => {
    const parsed = propertyIntelligenceGlobalSettingsPatchSchema.safeParse({
      monthlyApiBudget: -1,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects browser TTL greater than database TTL", () => {
    const parsed = propertyIntelligenceCategorySettingsPatchSchema.safeParse({
      category: "property_details",
      browserTtlSeconds: 10_000,
      databaseTtlSeconds: 100,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unimplemented provider ids at catalog gate (Zod allows ids; API validates)", () => {
    const parsed = propertyIntelligenceCategorySettingsPatchSchema.safeParse({
      category: "property_details",
      providerId: "future_vendor",
    });
    expect(parsed.success).toBe(true);
    expect(providerSupportsCategory("future_vendor", "property_details")).toBe(
      false
    );
  });
});

describe("Property Intelligence admin — settings repository", () => {
  it("updates global settings and bumps config version", async () => {
    const repo = new MemoryPropertyIntelligenceSettingsRepository();
    const before = (await repo.getResolvedConfig()).global.configVersion;
    const updated = await repo.updateGlobal(
      {
        featureEnabled: true,
        monthlyApiBudget: 100,
      },
      "admin-user"
    );
    expect(updated.featureEnabled).toBe(true);
    expect(updated.monthlyApiBudget).toBe(100);
    expect(updated.configVersion).toBe(before + 1);
  });

  it("toggles categories and bumps versions", async () => {
    const repo = new MemoryPropertyIntelligenceSettingsRepository();
    const before = (await repo.getResolvedConfig()).categories
      .property_valuation.configVersion;
    const next = await repo.updateCategory("property_valuation", {
      enabled: false,
    });
    expect(next.enabled).toBe(false);
    expect(next.configVersion).toBe(before + 1);
    const global = (await repo.getResolvedConfig()).global;
    expect(global.configVersion).toBeGreaterThan(1);
  });

  it("rejects invalid TTL updates", async () => {
    const repo = new MemoryPropertyIntelligenceSettingsRepository();
    await expect(
      repo.updateCategory("nearby_houses", {
        browserTtlSeconds: 999_999,
        databaseTtlSeconds: 100,
      })
    ).rejects.toThrow(/browser TTL/i);
  });

  it("applies budget changes without fabricating usage", async () => {
    const repo = new MemoryPropertyIntelligenceSettingsRepository();
    await repo.updateGlobal({ monthlyApiBudget: 42 });
    const config = await repo.getResolvedConfig();
    expect(config.global.monthlyApiBudget).toBe(42);
  });
});

describe("Property Intelligence admin — cache invalidation", () => {
  it("soft-invalidates without triggering provider fetches", async () => {
    const cacheRepo = new MemoryPropertyCacheRepository();
    const cacheService = createPropertyCacheService(
      cacheRepo,
      new MemoryPropertyIdentityRepository()
    );
    const key = cacheService.detailsKey("mock", "PROP|1");
    await cacheService.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { x: 1 },
      ttl: { databaseTtlSeconds: 3600 },
    });

    const service = createCacheInvalidationService(cacheRepo);
    const result = await service.invalidate({
      scope: "property",
      normalizedIdentityKey: "PROP|1",
    });
    expect(result.triggeredProviderFetch).toBe(false);
    expect(result.invalidatedCount).toBe(1);

    const all = await service.invalidate({ scope: "all" });
    expect(all.triggeredProviderFetch).toBe(false);
  });

  it("validates invalidation scopes", () => {
    expect(
      propertyIntelligenceCacheInvalidateSchema.safeParse({
        scope: "all",
      }).success
    ).toBe(true);
    expect(
      propertyIntelligenceCacheInvalidateSchema.safeParse({
        scope: "zip",
        countryCode: "US",
        zipCode: "78701",
      }).success
    ).toBe(true);
    expect(
      propertyIntelligenceCacheInvalidateSchema.safeParse({
        scope: "provider",
      }).success
    ).toBe(false);
  });
});

describe("Property Intelligence admin — empty usage shape", () => {
  it("can represent empty measured counters without inventing savings", () => {
    const empty = {
      billingPeriod: "2026-11",
      configuredBudget: 500,
      applicationLocal: {
        unitsReserved: 0,
        unitsConsumed: 0,
        remaining: 500,
        successfulRequests: 0,
        failedRequests: 0,
        budgetBlockedRequests: 0,
        byProvider: {},
        byOperation: {},
      },
      measuredServerSide: {
        databaseCacheHitRate: { available: false },
      },
      notMeasuredServerSide: {
        browserCacheHitRate: { available: false },
        verifiedProviderAccountUsage: { available: false },
      },
    };

    expect(empty.applicationLocal.unitsConsumed).toBe(0);
    expect(empty.measuredServerSide.databaseCacheHitRate.available).toBe(false);
    expect(
      empty.notMeasuredServerSide.verifiedProviderAccountUsage.available
    ).toBe(false);
    expect(PROPERTY_DATA_CATEGORIES).not.toContain("schools" as never);
  });
});

describe("Property Intelligence admin — unauthorized contract", () => {
  it("documents that admin routes use requirePlatformAdmin (no separate auth)", () => {
    const settingsRoute = require("fs").readFileSync(
      require("path").resolve(
        process.cwd(),
        "app/api/admin/property-intelligence/settings/route.ts"
      ),
      "utf8"
    );
    expect(settingsRoute).toContain("requirePlatformAdmin");
    expect(settingsRoute).not.toContain("createPropertyIntelligenceAdminAuth");

    const page = require("fs").readFileSync(
      require("path").resolve(
        process.cwd(),
        "app/dashboard/admin/property-intelligence/page.tsx"
      ),
      "utf8"
    );
    expect(page).toContain("isPlatformAdmin");
  });
});
