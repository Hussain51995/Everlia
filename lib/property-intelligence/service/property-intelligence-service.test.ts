import { describe, expect, it } from "vitest";
import { createTestPropertyCacheService } from "@/lib/property-intelligence/cache/test-cache";
import { createStubBudgetGateway } from "@/lib/property-intelligence/execution/budget-gateway";
import {
  createMockProvider,
  type MockProviderScenario,
} from "@/lib/property-intelligence/providers/mock/provider";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { createPropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";
import type {
  PropertyDataCategory,
  PropertyLookup,
  ProviderOutcome,
  PropertyDetails,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

function buildService(options?: {
  featureEnabled?: boolean;
  scenario?: MockProviderScenario;
  budgetAllow?: boolean;
  providers?: PropertyDataProvider[];
  disable?: PropertyDataCategory[];
  categoryProviders?: Partial<Record<PropertyDataCategory, string>>;
}) {
  const settings = new MemoryPropertyIntelligenceSettingsRepository();
  settings.setFeatureEnabled(options?.featureEnabled ?? true);
  for (const c of PROPERTY_DATA_CATEGORIES) {
    settings.setCategoryProvider(c, "mock");
  }
  for (const c of options?.disable ?? []) {
    settings.setCategoryEnabled(c, false);
  }
  if (options?.categoryProviders) {
    for (const [cat, providerId] of Object.entries(options.categoryProviders)) {
      settings.setCategoryProvider(
        cat as PropertyDataCategory,
        providerId
      );
    }
  }

  const { cache } = createTestPropertyCacheService({
    getInvalidationGeneration: async () =>
      (await settings.getResolvedConfig()).global.configVersion,
  });

  const registry = new PropertyProviderRegistry({
    defaultProviderId: "mock",
  });
  if (options?.providers) {
    for (const p of options.providers) registry.register(p);
  } else {
    registry.register(
      createMockProvider({ scenario: options?.scenario ?? "success" })
    );
  }

  const budget = createStubBudgetGateway({
    allow: options?.budgetAllow ?? true,
    monthlyBudget: 100,
  });

  const service = createPropertyIntelligenceService({
    settings,
    cache,
    registry,
    budget,
  });

  return { service, settings, cache, registry, budget };
}

const auth = {
  organizationId: "org-1",
  customerId: "cust-1",
  customer: {
    property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
  },
};

describe("PropertyIntelligenceService orchestration", () => {
  it("returns disabled categories and no provider work when feature is off", async () => {
    const { service, budget } = buildService({ featureEnabled: false });
    const result = await service.getInsights({ auth });
    expect(result.featureEnabled).toBe(false);
    expect(result.identity).toBeNull();
    for (const category of PROPERTY_DATA_CATEGORIES) {
      expect(result.categories[category].status).toBe("disabled");
      expect(result.categories[category].data).toBeNull();
    }
    expect(budget.getUsedUnits()).toBe(0);
  });

  it("handles missing property address without failing the envelope", async () => {
    const { service } = buildService();
    const result = await service.getInsights({
      auth: {
        ...auth,
        customer: { property_address: null },
      },
    });
    expect(result.featureEnabled).toBe(true);
    expect(result.identity).toBeNull();
    expect(result.categories.property_details.status).toBe("unavailable");
  });

  it("fetches all categories when none are cached", async () => {
    const { service, budget } = buildService();
    const result = await service.getInsights({ auth });
    expect(result.featureEnabled).toBe(true);
    expect(result.identity?.normalizedKey).toContain("GRAND LAKE");
    for (const category of PROPERTY_DATA_CATEGORIES) {
      expect(result.categories[category].status).toBe("available");
      expect(result.categories[category].data).toBeTruthy();
    }
    expect(budget.getUsedUnits()).toBeGreaterThanOrEqual(4);
    expect(budget.getUsedUnits()).toBeLessThanOrEqual(5);
  });

  it("returns three from cache and fetches only the two missing", async () => {
    const counting = createCountingProvider();
    const { service, cache, settings } = buildService({
      providers: [counting],
    });
    const config = await settings.getResolvedConfig();
    const first = await service.getInsights({
      auth,
      requestedCategories: [
        "property_details",
        "property_valuation",
        "nearby_houses",
      ],
    });
    expect(first.categories.property_details.status).toBe("available");
    counting.reset();

    void cache;
    void config;

    const second = await service.getInsights({ auth });
    expect(second.categories.property_details.status).toBe("available");
    expect(second.categories.property_valuation.status).toBe("available");
    expect(second.categories.nearby_houses.status).toBe("available");
    expect(second.categories.nearby_land.status).toBe("available");
    expect(second.categories.market_statistics.status).toBe("available");

    expect(counting.calls.property_details).toBe(0);
    expect(counting.calls.property_valuation).toBe(0);
    expect(counting.calls.nearby_houses).toBe(0);
    expect(counting.calls.nearby_land).toBe(1);
    expect(counting.calls.market_statistics).toBe(1);
  });

  it("skips disabled categories entirely", async () => {
    const counting = createCountingProvider();
    const { service } = buildService({
      providers: [counting],
      disable: ["nearby_land", "market_statistics"],
    });
    const result = await service.getInsights({ auth });
    expect(result.categories.nearby_land.status).toBe("disabled");
    expect(result.categories.market_statistics.status).toBe("disabled");
    expect(result.categories.nearby_land.data).toBeNull();
    expect(counting.calls.nearby_land).toBe(0);
    expect(counting.calls.market_statistics).toBe(0);
  });

  it("uses valuation incidental details to avoid a redundant details fetch", async () => {
    const counting = createCountingProvider();
    const { service } = buildService({ providers: [counting] });
    await service.getInsights({
      auth,
      requestedCategories: ["property_details", "property_valuation"],
    });
    expect(counting.calls.property_valuation).toBe(1);
    expect(counting.calls.property_details).toBe(0);
  });

  it("still fetches details when valuation subject coverage is incomplete", async () => {
    const counting = createCountingProvider({ incompleteValuationDetails: true });
    const { service } = buildService({ providers: [counting] });
    await service.getInsights({
      auth,
      requestedCategories: ["property_details", "property_valuation"],
    });
    expect(counting.calls.property_valuation).toBe(1);
    expect(counting.calls.property_details).toBe(1);
  });

  it("isolates partial provider failures per category", async () => {
    const { service } = buildService({ scenario: "rate_limited" });
    const result = await service.getInsights({
      auth,
      requestedCategories: ["property_details", "nearby_houses"],
    });
    expect(result.categories.property_details.status).toBe("rate_limited");
    expect(result.categories.nearby_houses.status).toBe("rate_limited");
    expect(result.featureEnabled).toBe(true);
  });

  it("returns budget_exhausted when gateway denies", async () => {
    const { service } = buildService({ budgetAllow: false });
    const result = await service.getInsights({
      auth,
      requestedCategories: ["property_details"],
    });
    expect(result.categories.property_details.status).toBe("budget_exhausted");
  });

  it("supports different providers per category via settings", async () => {
    const a = createMockProvider({ label: "Mock A", scenario: "success" });
    const inner = createMockProvider({ label: "Mock B", scenario: "success" });
    const tag = async <T>(
      outcome: ProviderOutcome<T>
    ): Promise<ProviderOutcome<T>> => {
      if (outcome.status !== "ok") return outcome;
      return {
        ...outcome,
        source: { ...outcome.source, providerId: "mock-b" },
      };
    };
    const b: PropertyDataProvider = {
      id: "mock-b",
      displayName: "Mock B",
      isMock: true,
      capabilities: () => inner.capabilities(),
      getCapability: (category) => inner.getCapability(category),
      getPropertyDetails: async (input) =>
        tag(await inner.getPropertyDetails(input)),
      getPropertyValuation: async (input) =>
        tag(await inner.getPropertyValuation(input)),
      getNearbyResidentialListings: async (input, query) =>
        tag(await inner.getNearbyResidentialListings(input, query)),
      getNearbyLandListings: async (input, query) =>
        tag(await inner.getNearbyLandListings(input, query)),
      getMarketStatistics: async (input) =>
        tag(await inner.getMarketStatistics(input)),
    };
    const { service } = buildService({
      providers: [a, b],
      categoryProviders: {
        property_details: "mock",
        property_valuation: "mock-b",
      },
    });
    const result = await service.getInsights({
      auth,
      requestedCategories: ["property_details", "property_valuation"],
    });
    expect(result.categories.property_details.status).toBe("available");
    expect(result.categories.property_valuation.status).toBe("available");
    expect(result.categories.property_details.source?.providerId).toBe("mock");
    expect(result.categories.property_valuation.source?.providerId).toBe(
      "mock-b"
    );
  });
});

function createCountingProvider(options?: {
  incompleteValuationDetails?: boolean;
}): PropertyDataProvider & {
  calls: Record<PropertyDataCategory, number>;
  reset: () => void;
} {
  const base = createMockProvider({ scenario: "success" });
  const calls: Record<PropertyDataCategory, number> = {
    property_details: 0,
    property_valuation: 0,
    nearby_houses: 0,
    nearby_land: 0,
    market_statistics: 0,
  };

  return {
    id: base.id,
    displayName: base.displayName,
    isMock: true,
    capabilities: () => base.capabilities(),
    getCapability: (c) => base.getCapability(c),
    calls,
    reset() {
      for (const k of PROPERTY_DATA_CATEGORIES) calls[k] = 0;
    },
    async getPropertyDetails(input: PropertyLookup) {
      calls.property_details += 1;
      return base.getPropertyDetails(input);
    },
    async getPropertyValuation(input: PropertyLookup) {
      calls.property_valuation += 1;
      const outcome = await base.getPropertyValuation(input);
      if (
        options?.incompleteValuationDetails &&
        outcome.status === "ok"
      ) {
        const data: PropertyValuation = {
          ...outcome.data,
          subjectDetails: {
            ...(outcome.data.subjectDetails as PropertyDetails),
            specifications: {
              ...(outcome.data.subjectDetails as PropertyDetails).specifications,
              propertyType: "unknown",
              bedrooms: null,
              bathrooms: null,
              livingArea: null,
              lotSize: null,
              yearBuilt: null,
            },
          },
        };
        return { ...outcome, data };
      }
      return outcome;
    },
    async getNearbyResidentialListings(input, query) {
      calls.nearby_houses += 1;
      return base.getNearbyResidentialListings(input, query);
    },
    async getNearbyLandListings(input, query) {
      calls.nearby_land += 1;
      return base.getNearbyLandListings(input, query);
    },
    async getMarketStatistics(input) {
      calls.market_statistics += 1;
      return base.getMarketStatistics(input);
    },
  };
}
