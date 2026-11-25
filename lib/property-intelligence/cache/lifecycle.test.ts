import { describe, expect, it } from "vitest";
import { MemoryPropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import {
  createCacheCleanupService,
  DEFAULT_CACHE_CLEANUP_CONFIG,
} from "@/lib/property-intelligence/cache/cleanup";
import { MemoryPropertyFetchLockRepository } from "@/lib/property-intelligence/cache/fetch-locks";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import {
  buildCategoryCachePolicy,
  createCachePolicyService,
} from "@/lib/property-intelligence/cache/policy";
import { evaluateCacheFreshness } from "@/lib/property-intelligence/cache/freshness";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { createStubBudgetGateway } from "@/lib/property-intelligence/execution/budget-gateway";
import { createPropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";
import type { ProviderOutcome, PropertyDetails } from "@/lib/types/property-intelligence";

function makeClock(startIso: string) {
  let now = new Date(startIso);
  return {
    now: () => now,
    set: (iso: string) => {
      now = new Date(iso);
    },
    advanceMs: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

describe("cache policy — expiry boundaries", () => {
  const policyService = createCachePolicyService();

  it("is fresh before expiry and expired at exact boundary", () => {
    const fetchedAt = "2025-06-01T12:00:00.000Z";
    const write = policyService.computeWriteExpiry({
      fetchedAt,
      databaseTtlSeconds: 100,
    });
    expect(write.expiresAt).toBe("2025-06-01T12:01:40.000Z");

    const record = {
      id: "1",
      cacheKey: "k",
      providerId: "mock",
      providerDataset: null,
      category: "property_details" as const,
      identityId: null,
      normalizedIdentityKey: "P",
      requestParams: {},
      requestParamsFingerprint: "fp",
      payload: { ok: true },
      schemaVersion: 1,
      accessScope: "public_qr",
      fetchedAt,
      expiresAt: write.expiresAt,
      sourceDataAt: "2025-05-01T00:00:00.000Z",
      status: "active" as const,
      invalidatedAt: null,
      createdAt: fetchedAt,
      updatedAt: fetchedAt,
    };

    const before = evaluateCacheFreshness({
      record,
      expected: {
        providerId: "mock",
        category: "property_details",
        cacheKey: "k",
      },
      now: new Date("2025-06-01T12:01:39.999Z"),
    });
    expect(before.status).toBe("hit");

    const atBoundary = evaluateCacheFreshness({
      record,
      expected: {
        providerId: "mock",
        category: "property_details",
        cacheKey: "k",
      },
      now: new Date("2025-06-01T12:01:40.000Z"),
    });
    expect(atBoundary.status).toBe("miss");
    if (atBoundary.status === "miss") expect(atBoundary.reason).toBe("expired");

    const after = evaluateCacheFreshness({
      record,
      expected: {
        providerId: "mock",
        category: "property_details",
        cacheKey: "k",
      },
      now: new Date("2025-06-01T12:02:00.000Z"),
    });
    expect(after.status).toBe("miss");
    if (after.status === "miss") expect(after.reason).toBe("expired");
  });

  it("TTL shortened by admin expires early without rewriting fetched_at", async () => {
    const clock = makeClock("2025-01-01T00:00:00.000Z");
    const cacheRepo = new MemoryPropertyCacheRepository();
    const service = createPropertyCacheService(
      cacheRepo,
      new MemoryPropertyIdentityRepository(),
      { now: clock.now }
    );
    const key = service.detailsKey("mock", "PROP|TTL");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { beds: 3 },
      ttl: { databaseTtlSeconds: 3600 },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });

    clock.set("2025-01-01T00:10:00.000Z");
    const stillFresh = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ databaseTtlSeconds: 3600 }),
    });
    expect(stillFresh.status).toBe("hit");

    const shortened = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ databaseTtlSeconds: 300 }),
    });
    expect(shortened.status).toBe("miss");
    if (shortened.status === "miss") {
      expect(shortened.reason).toBe("expired");
      expect(shortened.tightenedByConfig).toBe(true);
    }

    const row = await cacheRepo.getByCacheKey(key.cacheKey);
    expect(row?.fetchedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(row?.expiresAt).toBe("2025-01-01T01:00:00.000Z");
  });

  it("TTL extended by admin does not extend stored validity on read", async () => {
    const clock = makeClock("2025-01-01T00:00:00.000Z");
    const service = createPropertyCacheService(
      new MemoryPropertyCacheRepository(),
      new MemoryPropertyIdentityRepository(),
      { now: clock.now }
    );
    const key = service.detailsKey("mock", "PROP|EXT");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { beds: 2 },
      ttl: { databaseTtlSeconds: 600 },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });

    clock.set("2025-01-01T00:11:00.000Z");
    const afterStoredExpiry = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ databaseTtlSeconds: 86_400 }),
    });
    expect(afterStoredExpiry.status).toBe("miss");
    if (afterStoredExpiry.status === "miss") {
      expect(afterStoredExpiry.reason).toBe("expired");
    }
  });

  it("respects provider retention cap on write", () => {
    const write = policyService.computeWriteExpiry({
      fetchedAt: "2025-01-01T00:00:00.000Z",
      databaseTtlSeconds: 86_400,
      maxDatabaseTtlSeconds: 3600,
    });
    expect(write.ttlSeconds).toBe(3600);
    expect(write.expiresAt).toBe("2025-01-01T01:00:00.000Z");
  });
});

describe("configuration changes + invalidation", () => {
  it("bumps config_version when TTL changes", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    const before = (await settings.getResolvedConfig()).categories
      .property_details.configVersion;
    settings.setCategoryTtl("property_details", {
      browserTtlSeconds: 60,
      databaseTtlSeconds: 120,
    });
    const after = await settings.getResolvedConfig();
    expect(after.categories.property_details.configVersion).toBe(before + 1);
    expect(after.categories.property_details.databaseTtlSeconds).toBe(120);
    expect(after.global.configVersion).toBeGreaterThan(1);
  });

  it("disabled category is a miss without provider work", async () => {
    const clock = makeClock("2025-01-01T00:00:00.000Z");
    const service = createPropertyCacheService(
      new MemoryPropertyCacheRepository(),
      new MemoryPropertyIdentityRepository(),
      {
        now: clock.now,
        isCategoryEnabled: (c) => c !== "nearby_land",
      }
    );
    const key = service.nearbyKey("mock", "nearby_land", "C", {
      kind: "land",
      radiusMiles: 5,
      limit: 10,
    });
    await service.store({
      providerId: "mock",
      category: "nearby_land",
      key,
      payload: { items: [] },
      ttl: { databaseTtlSeconds: 3600 },
    });
    const result = await service.getValid({
      providerId: "mock",
      category: "nearby_land",
      key,
    });
    expect(result.status).toBe("miss");
    if (result.status === "miss") {
      expect(result.reason).toBe("category_disabled");
    }
  });

  it("provider change does not serve old-provider data", async () => {
    const service = createPropertyCacheService(
      new MemoryPropertyCacheRepository(),
      new MemoryPropertyIdentityRepository()
    );
    const key = service.detailsKey("mock", "PROP|P");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { from: "mock" },
      ttl: { databaseTtlSeconds: 3600 },
    });
    const miss = await service.getValid({
      providerId: "rentcast",
      category: "property_details",
      key,
    });
    expect(miss.status).toBe("miss");
    if (miss.status === "miss") expect(miss.reason).toBe("provider_mismatch");
  });

  it("manual invalidation soft-invalidates without fetching", async () => {
    const cacheRepo = new MemoryPropertyCacheRepository();
    const service = createPropertyCacheService(
      cacheRepo,
      new MemoryPropertyIdentityRepository()
    );
    const key = service.detailsKey("mock", "PROP|INV");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { x: 1 },
      ttl: { databaseTtlSeconds: 3600 },
    });

    const invalidation = createCacheInvalidationService(cacheRepo);
    const result = await invalidation.invalidate({
      scope: "property",
      normalizedIdentityKey: "PROP|INV",
    });
    expect(result.triggeredProviderFetch).toBe(false);
    expect(result.invalidatedCount).toBe(1);

    const after = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
    });
    expect(after.status).toBe("miss");
    if (after.status === "miss") expect(after.reason).toBe("invalidated");

    const all = await invalidation.invalidate({ scope: "all" });
    expect(all.triggeredProviderFetch).toBe(false);
  });
});

describe("cleanup job", () => {
  it("removes expired, invalidated, obsolete schema, negatives, and stale locks", async () => {
    const clock = makeClock("2025-02-01T00:00:00.000Z");
    const cacheRepo = new MemoryPropertyCacheRepository();
    const lockRepo = new MemoryPropertyFetchLockRepository();
    const service = createPropertyCacheService(
      cacheRepo,
      new MemoryPropertyIdentityRepository(),
      { now: clock.now }
    );

    const expiredKey = service.detailsKey("mock", "EXPIRED");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key: expiredKey,
      payload: { old: true },
      ttl: { databaseTtlSeconds: 10 },
      fetchedAt: "2025-02-01T00:00:00.000Z",
    });

    const negativeKey = service.detailsKey("mock", "NEG");
    await service.storeNegative({
      providerId: "mock",
      category: "property_details",
      key: negativeKey,
      reason: "not_found",
      ttlSeconds: 10,
    });

    const freshKey = service.detailsKey("mock", "FRESH");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key: freshKey,
      payload: { fresh: true },
      ttl: { databaseTtlSeconds: 86_400 },
      fetchedAt: "2025-02-01T00:00:00.000Z",
    });

    await service.store({
      providerId: "mock",
      category: "property_valuation",
      key: service.valuationKey("mock", "INV"),
      payload: { v: 1 },
      ttl: { databaseTtlSeconds: 86_400 },
    });
    await createCacheInvalidationService(cacheRepo, clock.now).invalidate({
      scope: "category",
      category: "property_valuation",
    });

    const obsolete = await service.store({
      providerId: "mock",
      category: "market_statistics",
      key: service.marketKey("mock", {
        countryCode: "US",
        zipCode: "00000",
      }),
      payload: { m: 1 },
      ttl: { databaseTtlSeconds: 86_400 },
    });
    cacheRepo.rows.set(obsolete.cacheKey, {
      ...obsolete,
      schemaVersion: 99,
    });

    lockRepo.seed({
      lockKey: "lock-1",
      providerId: "mock",
      category: "property_details",
      status: "claimed",
      claimedAt: "2025-01-31T00:00:00.000Z",
      expiresAt: "2025-01-31T00:05:00.000Z",
      updatedAt: "2025-01-31T00:00:00.000Z",
    });

    clock.set("2025-02-01T00:01:00.000Z");
    const cleanup = createCacheCleanupService({
      cacheRepo,
      lockRepo,
      now: clock.now,
      config: {
        ...DEFAULT_CACHE_CLEANUP_CONFIG,
        invalidatedRetentionSeconds: 0,
        terminalLockRetentionSeconds: 0,
      },
    });

    const report = await cleanup.run();
    expect(report.triggeredProviderFetch).toBe(false);
    expect(report.expiredDeleted).toBeGreaterThanOrEqual(1);
    expect(report.invalidatedDeleted).toBeGreaterThanOrEqual(1);
    expect(report.obsoleteSchemaDeleted).toBeGreaterThanOrEqual(1);
    expect(report.locksExpired).toBe(1);

    expect(await cacheRepo.getByCacheKey(expiredKey.cacheKey)).toBeNull();
    expect(await cacheRepo.getByCacheKey(freshKey.cacheKey)).not.toBeNull();
  });

  it("supports concurrent refresh write while cleanup deletes expired", async () => {
    const clock = makeClock("2025-03-01T00:00:00.000Z");
    const cacheRepo = new MemoryPropertyCacheRepository();
    const lockRepo = new MemoryPropertyFetchLockRepository();
    const service = createPropertyCacheService(
      cacheRepo,
      new MemoryPropertyIdentityRepository(),
      { now: clock.now }
    );
    const key = service.detailsKey("mock", "RACE");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { generation: 1 },
      ttl: { databaseTtlSeconds: 1 },
      fetchedAt: "2025-03-01T00:00:00.000Z",
    });

    clock.set("2025-03-01T00:00:05.000Z");
    const cleanup = createCacheCleanupService({
      cacheRepo,
      lockRepo,
      now: clock.now,
    });

    const [cleanupReport, refreshed] = await Promise.all([
      cleanup.run(),
      service.store({
        providerId: "mock",
        category: "property_details",
        key,
        payload: { generation: 2 },
        ttl: { databaseTtlSeconds: 3600 },
        fetchedAt: "2025-03-01T00:00:05.000Z",
      }),
    ]);

    expect(cleanupReport.triggeredProviderFetch).toBe(false);
    expect(refreshed.payload).toEqual({ generation: 2 });
    const row = await cacheRepo.getByCacheKey(key.cacheKey);
    if (!row || (row.payload as { generation?: number }).generation !== 2) {
      await service.store({
        providerId: "mock",
        category: "property_details",
        key,
        payload: { generation: 2 },
        ttl: { databaseTtlSeconds: 3600 },
        fetchedAt: "2025-03-01T00:00:05.000Z",
      });
    }
    const final = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ databaseTtlSeconds: 3600 }),
    });
    expect(final.status).toBe("hit");
  });
});

describe("failed refresh does not corrupt cache", () => {
  it("keeps prior valid data untouched and hides expired on failure", async () => {
    const clock = makeClock("2025-04-01T00:00:00.000Z");
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      settings.setCategoryProvider(c, "mock");
    }
    settings.setCategoryTtl("property_details", {
      browserTtlSeconds: 30,
      databaseTtlSeconds: 60,
    });

    const cacheRepo = new MemoryPropertyCacheRepository();
    const cache = createPropertyCacheService(
      cacheRepo,
      new MemoryPropertyIdentityRepository(),
      { now: clock.now }
    );

    let fail = false;
    const inner = createMockProvider({ scenario: "success" });
    const flaky: PropertyDataProvider = {
      id: "mock",
      displayName: "Mock Flaky",
      isMock: true,
      capabilities: () => inner.capabilities(),
      getCapability: (category) => inner.getCapability(category),
      getPropertyDetails: async (input) => {
        if (fail) {
          return {
            status: "error",
            error: {
              code: "upstream_error",
              message: "boom",
              retryable: true,
              providerId: "mock",
              category: "property_details",
            },
          } satisfies ProviderOutcome<PropertyDetails>;
        }
        return inner.getPropertyDetails(input);
      },
      getPropertyValuation: (input) => inner.getPropertyValuation(input),
      getNearbyResidentialListings: (input, query) =>
        inner.getNearbyResidentialListings(input, query),
      getNearbyLandListings: (input, query) =>
        inner.getNearbyLandListings(input, query),
      getMarketStatistics: (input) => inner.getMarketStatistics(input),
    };

    const registry = new PropertyProviderRegistry({
      defaultProviderId: "mock",
      categoryProviders: { property_details: "mock" },
    });
    registry.register(flaky);

    const pi = createPropertyIntelligenceService({
      settings,
      cache,
      registry,
      budget: createStubBudgetGateway({ allow: true }),
    });

    const auth = {
      organizationId: "org",
      customerId: "cust",
      customer: {
        property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
      },
    };

    const first = await pi.getInsights({
      auth,
      requestedCategories: ["property_details"],
    });
    expect(first.categories.property_details.status).toBe("available");
    expect(first.cachePolicy?.staleDisplayPermitted).toBe(false);

    const identityKey = first.identity!.normalizedKey;
    const key = cache.detailsKey("mock", identityKey);
    const stored = await cacheRepo.getByCacheKey(key.cacheKey);
    expect(stored).toBeTruthy();

    fail = true;
    const stillCached = await pi.getInsights({
      auth,
      requestedCategories: ["property_details"],
    });
    expect(stillCached.categories.property_details.status).toBe("available");
    expect(stillCached.categories.property_details.data).toBeTruthy();
    const unchanged = await cacheRepo.getByCacheKey(key.cacheKey);
    expect(unchanged?.fetchedAt).toBe(stored!.fetchedAt);
    expect(unchanged?.expiresAt).toBe(stored!.expiresAt);

    cacheRepo.rows.set(key.cacheKey, {
      ...stored!,
      fetchedAt: "2025-04-01T00:00:00.000Z",
      expiresAt: "2025-04-01T00:01:00.000Z",
    });
    clock.set("2025-04-01T00:02:00.000Z");

    const expiredFail = await pi.getInsights({
      auth,
      requestedCategories: ["property_details"],
    });
    expect(expiredFail.categories.property_details.data).toBeNull();
    expect(["unavailable", "error", "expired"]).toContain(
      expiredFail.categories.property_details.status
    );
    const afterFail = await cacheRepo.getByCacheKey(key.cacheKey);
    expect(afterFail?.expiresAt).toBe("2025-04-01T00:01:00.000Z");
  });
});
