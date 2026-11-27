import { describe, expect, it } from "vitest";
import { addressNormalizationService } from "@/lib/property-intelligence/address-normalization";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import { createTestPropertyCacheService } from "@/lib/property-intelligence/cache/test-cache";
import { MemoryPropertyBudgetRepository } from "@/lib/property-intelligence/execution/budget-repository";
import { createStubBudgetGateway } from "@/lib/property-intelligence/execution/budget-gateway";
import { createBudgetService } from "@/lib/property-intelligence/execution/budget-service";
import { MemoryPropertyFetchDedupeRepository } from "@/lib/property-intelligence/execution/dedupe";
import { createProviderExecutionGateway } from "@/lib/property-intelligence/execution/provider-gateway";
import {
  createUsageTracker,
  MemoryPropertyUsageRepository,
} from "@/lib/property-intelligence/execution/usage-tracker";
import { createRequestPlanner } from "@/lib/property-intelligence/planner/planner";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import { createPropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

const AUTH = {
  organizationId: "org-redis",
  customerId: "cust-redis",
  customer: {
    property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
  },
};

function makeClock(startIso: string) {
  let now = new Date(startIso);
  return {
    now: () => now,
    set: (iso: string) => {
      now = new Date(iso);
    },
  };
}

function countingMock() {
  const inner = createMockProvider({ scenario: "success" });
  const counts: Record<string, number> = {
    getPropertyDetails: 0,
    getPropertyValuation: 0,
    getNearbyResidentialListings: 0,
    getNearbyLandListings: 0,
    getMarketStatistics: 0,
  };
  const provider: PropertyDataProvider = {
    id: "mock",
    displayName: "Mock Counting",
    isMock: true,
    capabilities: () => inner.capabilities(),
    getCapability: (c) => inner.getCapability(c),
    getPropertyDetails: async (i) => {
      counts.getPropertyDetails += 1;
      return inner.getPropertyDetails(i);
    },
    getPropertyValuation: async (i) => {
      counts.getPropertyValuation += 1;
      return inner.getPropertyValuation(i);
    },
    getNearbyResidentialListings: async (i, q) => {
      counts.getNearbyResidentialListings += 1;
      return inner.getNearbyResidentialListings(i, q);
    },
    getNearbyLandListings: async (i, q) => {
      counts.getNearbyLandListings += 1;
      return inner.getNearbyLandListings(i, q);
    },
    getMarketStatistics: async (i) => {
      counts.getMarketStatistics += 1;
      return inner.getMarketStatistics(i);
    },
  };
  return { provider, counts };
}

function buildPi(options?: {
  settings?: MemoryPropertyIntelligenceSettingsRepository;
  monthlyBudget?: number;
  now?: () => Date;
  simulateUnavailable?: boolean;
  getInvalidationGeneration?: () => number | Promise<number>;
}) {
  const settings =
    options?.settings ?? new MemoryPropertyIntelligenceSettingsRepository();
  settings.setFeatureEnabled(true);
  for (const c of PROPERTY_DATA_CATEGORIES) {
    settings.setCategoryProvider(c, "mock");
  }

  const { provider, counts } = countingMock();
  const registry = new PropertyProviderRegistry({ defaultProviderId: "mock" });
  registry.register(provider);

  const { cache, provider: redis } = createTestPropertyCacheService({
    options: { now: options?.now },
    getInvalidationGeneration:
      options?.getInvalidationGeneration ??
      (async () => (await settings.getResolvedConfig()).global.configVersion),
  });
  if (options?.simulateUnavailable) {
    redis.simulateUnavailable = true;
  }

  const usage = createUsageTracker(new MemoryPropertyUsageRepository());
  const gateway = createProviderExecutionGateway({
    budget: createBudgetService(new MemoryPropertyBudgetRepository(), {
      monthlyBudget: options?.monthlyBudget ?? 100,
      apiAccountScope: "default",
    }),
    dedupe: new MemoryPropertyFetchDedupeRepository(),
    usage,
    enforceBudgetForMock: true,
  });

  const service = createPropertyIntelligenceService({
    settings,
    cache,
    registry,
    budget: gateway,
    usage,
  });

  return { service, cache, redis, settings, registry, counts, usage };
}

describe("Redis cache-aside retrieval", () => {
  it("serves all five categories from Redis without refetch", async () => {
    const { service, counts } = buildPi();
    const first = await service.getInsights({ auth: AUTH });
    for (const c of PROPERTY_DATA_CATEGORIES) {
      expect(first.categories[c].status).toBe("available");
    }
    const afterFirst = { ...counts };

    const second = await service.getInsights({ auth: AUTH });
    for (const c of PROPERTY_DATA_CATEGORIES) {
      expect(second.categories[c].status).toBe("available");
    }
    expect(counts.getPropertyDetails).toBe(afterFirst.getPropertyDetails);
    expect(counts.getPropertyValuation).toBe(afterFirst.getPropertyValuation);
    expect(counts.getNearbyResidentialListings).toBe(
      afterFirst.getNearbyResidentialListings
    );
    expect(counts.getNearbyLandListings).toBe(afterFirst.getNearbyLandListings);
    expect(counts.getMarketStatistics).toBe(afterFirst.getMarketStatistics);
  });

  it("fetches only missing categories on partial Redis cache", async () => {
    const { service, counts } = buildPi();
    await service.getInsights({
      auth: AUTH,
      requestedCategories: [
        "property_details",
        "property_valuation",
        "nearby_houses",
      ],
    });
    for (const k of Object.keys(counts)) counts[k] = 0;

    const result = await service.getInsights({ auth: AUTH });
    expect(result.categories.property_details.status).toBe("available");
    expect(result.categories.property_valuation.status).toBe("available");
    expect(result.categories.nearby_houses.status).toBe("available");
    expect(result.categories.nearby_land.status).toBe("available");
    expect(result.categories.market_statistics.status).toBe("available");

    expect(counts.getPropertyDetails).toBe(0);
    expect(counts.getPropertyValuation).toBe(0);
    expect(counts.getNearbyResidentialListings).toBe(0);
    expect(counts.getNearbyLandListings).toBe(1);
    expect(counts.getMarketStatistics).toBe(1);
  });

  it("refetches only an expired category", async () => {
    const clock = makeClock("2025-06-01T00:00:00.000Z");
    const { service, cache, counts } = buildPi({ now: clock.now });
    await service.getInsights({
      auth: AUTH,
      requestedCategories: ["property_details", "property_valuation"],
    });
    const afterWarm = { ...counts };

    const identity = addressNormalizationService.normalize(
      AUTH.customer.property_address
    ).identity;
    await cache.store({
      providerId: "mock",
      category: "property_details",
      key: cache.detailsKey("mock", identity.normalizedKey),
      payload: { aged: true },
      ttl: { redisTtlSeconds: 30 },
      fetchedAt: "2025-06-01T00:00:00.000Z",
    });
    clock.set("2025-06-01T00:01:00.000Z");

    await service.getInsights({
      auth: AUTH,
      requestedCategories: ["property_details", "property_valuation"],
    });
    expect(counts.getPropertyDetails).toBeGreaterThan(
      afterWarm.getPropertyDetails
    );
    expect(counts.getPropertyValuation).toBe(afterWarm.getPropertyValuation);
  });

  it("skips disabled categories", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setCategoryEnabled("nearby_land", false);
    const { service, counts } = buildPi({ settings });
    const result = await service.getInsights({ auth: AUTH });
    expect(result.categories.nearby_land.status).toBe("disabled");
    expect(counts.getNearbyLandListings).toBe(0);
  });

  it("does not reuse cache entries after provider switch", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      settings.setCategoryProvider(c, "mock");
    }
    settings.setCategoryProvider("property_details", "altavista");

    const altInner = createMockProvider({ scenario: "success" });
    let altCalls = 0;
    const altavista: PropertyDataProvider = {
      id: "altavista",
      displayName: "Altavista",
      isMock: true,
      capabilities: () => altInner.capabilities(),
      getCapability: (c) => altInner.getCapability(c),
      getPropertyDetails: async (i) => {
        altCalls += 1;
        return altInner.getPropertyDetails(i);
      },
      getPropertyValuation: (i) => altInner.getPropertyValuation(i),
      getNearbyResidentialListings: (i, q) =>
        altInner.getNearbyResidentialListings(i, q),
      getNearbyLandListings: (i, q) => altInner.getNearbyLandListings(i, q),
      getMarketStatistics: (i) => altInner.getMarketStatistics(i),
    };

    const registry = new PropertyProviderRegistry({
      defaultProviderId: "mock",
    });
    registry.register(createMockProvider({ scenario: "success" }));
    registry.register(altavista);

    const { cache } = createTestPropertyCacheService({
      getInvalidationGeneration: async () =>
        (await settings.getResolvedConfig()).global.configVersion,
    });
    const identity = addressNormalizationService.normalize(
      AUTH.customer.property_address
    ).identity;
    await cache.store({
      providerId: "mock",
      category: "property_details",
      key: cache.detailsKey("mock", identity.normalizedKey),
      payload: { from: "mock" },
      ttl: { redisTtlSeconds: 3600 },
    });

    const service = createPropertyIntelligenceService({
      settings,
      cache,
      registry,
      budget: createStubBudgetGateway({ allow: true }),
    });
    const result = await service.getInsights({
      auth: AUTH,
      requestedCategories: ["property_details"],
    });
    expect(result.categories.property_details.status).toBe("available");
    expect(altCalls).toBe(1);
  });

  it("reuses shared ZIP market statistics across properties", async () => {
    const { service, counts, cache } = buildPi();
    await service.getInsights({
      auth: AUTH,
      requestedCategories: ["market_statistics"],
    });
    expect(counts.getMarketStatistics).toBe(1);

    const other = await service.getInsights({
      auth: {
        ...AUTH,
        customerId: "cust-other",
        customer: {
          property_address: "100 Main St, San Antonio, TX 78244",
        },
      },
      requestedCategories: ["market_statistics"],
    });
    expect(other.categories.market_statistics.status).toBe("available");
    expect(counts.getMarketStatistics).toBe(1);

    const hit = await cache.getValid({
      providerId: "mock",
      category: "market_statistics",
      key: cache.marketKey("mock", {
        countryCode: "US",
        zipCode: "78244",
      }),
    });
    expect(hit.status).toBe("hit");
  });

  it("returns temporary unavailable when Redis is down (no provider fan-out)", async () => {
    const { service, counts, usage } = buildPi({ simulateUnavailable: true });
    const result = await service.getInsights({
      auth: AUTH,
      requestedCategories: ["property_details", "nearby_land"],
    });
    expect(result.categories.property_details.status).toBe("unavailable");
    expect(result.categories.nearby_land.status).toBe("unavailable");
    expect(counts.getPropertyDetails).toBe(0);
    expect(counts.getNearbyLandListings).toBe(0);
    expect(usage.getMetrics().cacheUnavailable).toBeGreaterThanOrEqual(1);
  });

  it("returns provider data when Redis write fails and records the failure", async () => {
    const { service, redis, usage, counts } = buildPi();
    redis.failNextWrites = 50;
    const result = await service.getInsights({
      auth: AUTH,
      requestedCategories: ["property_details"],
    });
    expect(result.categories.property_details.status).toBe("available");
    expect(result.categories.property_details.data).toBeTruthy();
    expect(counts.getPropertyDetails).toBeGreaterThanOrEqual(1);
    expect(usage.getMetrics().cacheWriteFailures).toBeGreaterThanOrEqual(1);
  });

  it("enforces durable budget exhaustion", async () => {
    const { service } = buildPi({ monthlyBudget: 1 });
    const result = await service.getInsights({ auth: AUTH });
    const statuses = PROPERTY_DATA_CATEGORIES.map(
      (c) => result.categories[c].status
    );
    expect(
      statuses.some((s) => s === "budget_exhausted" || s === "available")
    ).toBe(true);
    expect(statuses.filter((s) => s === "available").length).toBeLessThan(5);
  });

  it("handles concurrent identical requests safely", async () => {
    const { service, counts } = buildPi();
    const [a, b] = await Promise.all([
      service.getInsights({
        auth: AUTH,
        requestedCategories: ["property_details"],
      }),
      service.getInsights({
        auth: AUTH,
        requestedCategories: ["property_details"],
      }),
    ]);
    expect(a.categories.property_details.status).toBe("available");
    expect(b.categories.property_details.status).toBe("available");
    expect(counts.getPropertyDetails).toBeLessThanOrEqual(2);
  });

  it("blocks in-flight writes after invalidation advances generation", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    let generation = 1;
    const { cache, provider: redis } = createTestPropertyCacheService({
      getInvalidationGeneration: () => generation,
    });
    const identity = addressNormalizationService.normalize(
      AUTH.customer.property_address
    ).identity;
    const key = cache.detailsKey("mock", identity.normalizedKey);

    await cache.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { v: 1 },
      ttl: { redisTtlSeconds: 3600 },
      expectedInvalidationGeneration: 1,
    });
    expect(redis.size()).toBe(1);

    await createCacheInvalidationService(cache).invalidate({
      scope: "property",
      normalizedIdentityKey: identity.normalizedKey,
    });
    generation = 2;
    await settings.bumpConfigVersion();

    const skipped = await cache.store({
      providerId: "mock",
      category: "property_details",
      key,
      payload: { v: "stale-inflight" },
      ttl: { redisTtlSeconds: 3600 },
      expectedInvalidationGeneration: 1,
    });
    expect(skipped).toBeNull();

    const miss = await cache.getValid({
      providerId: "mock",
      category: "property_details",
      key,
    });
    expect(miss.status).toBe("miss");
  });
});

describe("planner cache_unavailable disposition", () => {
  it("does not plan provider fetches when Redis is unavailable", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      settings.setCategoryProvider(c, "mock");
    }
    const registry = new PropertyProviderRegistry({ defaultProviderId: "mock" });
    registry.register(createMockProvider({ scenario: "success" }));
    const { cache, provider } = createTestPropertyCacheService();
    provider.simulateUnavailable = true;

    const identity = addressNormalizationService.normalize(
      AUTH.customer.property_address
    ).identity;
    const planner = createRequestPlanner();
    const plan = await planner.plan({
      identity,
      zipCode: "78244",
      config: await settings.getResolvedConfig(),
      registry,
      cache,
    });

    expect(plan.operations).toHaveLength(0);
    expect(
      plan.categoryStates.every((s) => s.disposition === "cache_unavailable")
    ).toBe(true);
  });
});
