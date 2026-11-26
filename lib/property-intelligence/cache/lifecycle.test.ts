import { describe, expect, it } from "vitest";
import { MemoryPropertyFetchLockRepository } from "@/lib/property-intelligence/cache/fetch-locks";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import { createTestPropertyCacheService } from "@/lib/property-intelligence/cache/test-cache";
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
      redisTtlSeconds: 100,
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
    const { cache: service } = createTestPropertyCacheService({
      options: { now: clock.now },
    });
    const key = service.detailsKey("mock", "PROP|TTL");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { beds: 3 },
      ttl: { redisTtlSeconds: 3600 },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });

    clock.set("2025-01-01T00:10:00.000Z");
    const stillFresh = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 3600 }),
    });
    expect(stillFresh.status).toBe("hit");
    if (stillFresh.status === "hit") {
      expect(stillFresh.record.fetchedAt).toBe("2025-01-01T00:00:00.000Z");
      expect(stillFresh.record.expiresAt).toBe("2025-01-01T01:00:00.000Z");
    }

    const shortened = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 300 }),
    });
    expect(shortened.status).toBe("miss");
    if (shortened.status === "miss") {
      expect(shortened.reason).toBe("expired");
      expect(shortened.tightenedByConfig).toBe(true);
    }
  });

  it("TTL extended by admin does not extend stored validity on read", async () => {
    const clock = makeClock("2025-01-01T00:00:00.000Z");
    const service = createTestPropertyCacheService({ options: { now: clock.now } }).cache;
    const key = service.detailsKey("mock", "PROP|EXT");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { beds: 2 },
      ttl: { redisTtlSeconds: 600 },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });

    clock.set("2025-01-01T00:11:00.000Z");
    const afterStoredExpiry = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 86_400 }),
    });
    expect(afterStoredExpiry.status).toBe("miss");
    if (afterStoredExpiry.status === "miss") {
      expect(afterStoredExpiry.reason).toBe("expired");
    }
  });

  it("respects provider retention cap on write", () => {
    const write = policyService.computeWriteExpiry({
      fetchedAt: "2025-01-01T00:00:00.000Z",
      redisTtlSeconds: 86_400,
      maxRedisTtlSeconds: 3600,
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
      browserTtlSeconds: 1800,
      redisTtlSeconds: 86400,
    });
    const after = await settings.getResolvedConfig();
    expect(after.categories.property_details.configVersion).toBe(before + 1);
    expect(after.categories.property_details.redisTtlSeconds).toBe(86400);
    expect(after.global.configVersion).toBeGreaterThan(1);
  });

  it("disabled category is a miss without provider work", async () => {
    const clock = makeClock("2025-01-01T00:00:00.000Z");
    const service = createTestPropertyCacheService({
      options: {
        now: clock.now,
        isCategoryEnabled: (c) => c !== "nearby_land",
      },
    }).cache;
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
      ttl: { redisTtlSeconds: 3600 },
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
    const service = createTestPropertyCacheService().cache;
    const key = service.detailsKey("mock", "PROP|P");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { from: "mock" },
      ttl: { redisTtlSeconds: 3600 },
    });
    const miss = await service.getValid({
      providerId: "rentcast",
      category: "property_details",
      key,
    });
    expect(miss.status).toBe("miss");
    if (miss.status === "miss") expect(miss.reason).toBe("not_found");
  });

  it("manual invalidation deletes Redis entries without fetching", async () => {
    const service = createTestPropertyCacheService().cache;
    const key = service.detailsKey("mock", "PROP|INV");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { x: 1 },
      ttl: { redisTtlSeconds: 3600 },
    });

    const invalidation = createCacheInvalidationService(service);
    const result = await invalidation.invalidate({
      scope: "property",
      normalizedIdentityKey: "PROP|INV",
    });
    expect(result.triggeredProviderFetch).toBe(false);
    expect(result.invalidatedCount).toBeGreaterThanOrEqual(1);

    const after = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key,
    });
    expect(after.status).toBe("miss");
    if (after.status === "miss") expect(after.reason).toBe("not_found");

    const all = await invalidation.invalidate({ scope: "all" });
    expect(all.triggeredProviderFetch).toBe(false);
  });
});

describe("Redis-native expiry (runtime L2)", () => {
  it("expires independent category TTLs without Supabase payload cleanup", async () => {
    const clock = makeClock("2025-02-01T00:00:00.000Z");
    const { cache: service, provider } = createTestPropertyCacheService({
      options: { now: clock.now },
    });

    const detailsKey = service.detailsKey("mock", "EXPIRED");
    const freshKey = service.detailsKey("mock", "FRESH");
    await service.store({
      providerId: "mock",
      category: "property_details",
      key: detailsKey,
      payload: { old: true },
      ttl: { redisTtlSeconds: 10 },
      fetchedAt: "2025-02-01T00:00:00.000Z",
    });
    await service.store({
      providerId: "mock",
      category: "property_details",
      key: freshKey,
      payload: { fresh: true },
      ttl: { redisTtlSeconds: 86_400 },
      fetchedAt: "2025-02-01T00:00:00.000Z",
    });

    clock.set("2025-02-01T00:01:00.000Z");
    const expired = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key: detailsKey,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 10 }),
    });
    const fresh = await service.getValid({
      providerId: "mock",
      category: "property_details",
      key: freshKey,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 86_400 }),
    });
    expect(expired.status).toBe("miss");
    expect(fresh.status).toBe("hit");
    expect(provider.size()).toBeGreaterThanOrEqual(1);
  });
});

describe("fetch lock recovery (no payload store)", () => {
  it("expires stale claimed locks without provider calls", async () => {
    const clock = makeClock("2025-02-01T00:00:00.000Z");
    const lockRepo = new MemoryPropertyFetchLockRepository();

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
    const locksExpired = await lockRepo.expireStaleLocks(
      100,
      clock.now().toISOString()
    );
    expect(locksExpired).toBe(1);
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
      browserTtlSeconds: 1800,
      redisTtlSeconds: 86400,
    });

    const cache = createTestPropertyCacheService({
      options: { now: clock.now },
      getInvalidationGeneration: async () =>
        (await settings.getResolvedConfig()).global.configVersion,
    }).cache;

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
    const stored = await cache.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 86_400 }),
    });
    expect(stored.status).toBe("hit");
    if (stored.status !== "hit") return;
    const originalFetchedAt = stored.record.fetchedAt;
    const originalExpiresAt = stored.record.expiresAt;

    fail = true;
    const stillCached = await pi.getInsights({
      auth,
      requestedCategories: ["property_details"],
    });
    expect(stillCached.categories.property_details.status).toBe("available");
    expect(stillCached.categories.property_details.data).toBeTruthy();
    const unchanged = await cache.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 86_400 }),
    });
    expect(unchanged.status).toBe("hit");
    if (unchanged.status === "hit") {
      expect(unchanged.record.fetchedAt).toBe(originalFetchedAt);
      expect(unchanged.record.expiresAt).toBe(originalExpiresAt);
    }

    await cache.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: stored.record.payload,
      ttl: { redisTtlSeconds: 60 },
      fetchedAt: "2025-04-01T00:00:00.000Z",
    });
    clock.set("2025-04-01T00:02:00.000Z");

    const expiredLookup = await cache.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 60 }),
    });
    expect(expiredLookup.status).toBe("miss");
    if (expiredLookup.status === "miss") {
      expect(["expired", "not_found"]).toContain(expiredLookup.reason);
    }

    const expiredFail = await pi.getInsights({
      auth,
      requestedCategories: ["property_details"],
    });
    expect(expiredFail.categories.property_details.data).toBeNull();
    expect(["unavailable", "error", "expired"]).toContain(
      expiredFail.categories.property_details.status
    );
    const afterFail = await cache.getValid({
      providerId: "mock",
      category: "property_details",
      key,
      policy: buildCategoryCachePolicy({ redisTtlSeconds: 60 }),
    });
    expect(afterFail.status).toBe("miss");
  });
});
