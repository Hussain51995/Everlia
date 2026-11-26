import { describe, expect, it } from "vitest";
import { addressNormalizationService } from "@/lib/property-intelligence/address-normalization";
import { createTestPropertyCacheService } from "@/lib/property-intelligence/cache/test-cache";
import { createRequestPlanner } from "@/lib/property-intelligence/planner/planner";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

function setup() {
  const settings = new MemoryPropertyIntelligenceSettingsRepository();
  settings.setFeatureEnabled(true);
  for (const category of PROPERTY_DATA_CATEGORIES) {
    settings.setCategoryProvider(category, "mock");
  }
  const { cache } = createTestPropertyCacheService();
  const registry = new PropertyProviderRegistry({
    defaultProviderId: "mock",
  });
  registry.register(createMockProvider({ scenario: "success" }));
  const planner = createRequestPlanner();
  const identity = addressNormalizationService.normalize(
    "5500 Grand Lake Dr, San Antonio, TX 78244"
  ).identity;
  return { settings, cache, registry, planner, identity };
}

describe("PropertyIntelligenceRequestPlanner", () => {
  it("plans no fetches when all enabled categories are cached", async () => {
    const { settings, cache, registry, planner, identity } = setup();
    const config = await settings.getResolvedConfig();

    for (const category of PROPERTY_DATA_CATEGORIES) {
      const providerId = config.categories[category].providerId;
      const key =
        category === "market_statistics"
          ? cache.marketKey(providerId, {
              countryCode: "US",
              zipCode: "78244",
            })
          : category === "nearby_houses"
            ? cache.nearbyKey(providerId, "nearby_houses", identity.normalizedKey, {
                kind: "residential",
                radiusMiles: 1,
                limit: 10,
              })
            : category === "nearby_land"
              ? cache.nearbyKey(providerId, "nearby_land", identity.normalizedKey, {
                  kind: "land",
                  radiusMiles: 5,
                  limit: 10,
                })
              : category === "property_valuation"
                ? cache.valuationKey(providerId, identity.normalizedKey)
                : cache.detailsKey(providerId, identity.normalizedKey);

      await cache.store({
        providerId,
        category,
        key,
        payload:
          category === "nearby_houses" || category === "nearby_land"
            ? { items: [] }
            : { cached: true },
        ttl: { redisTtlSeconds: 3600 },
      });
    }

    const plan = await planner.plan({
      identity,
      zipCode: "78244",
      config,
      registry,
      cache,
    });

    expect(plan.operations).toHaveLength(0);
    expect(plan.cacheHits).toHaveLength(5);
    expect(plan.toFetch).toHaveLength(0);
  });

  it("fetches only missing categories in a partial-cache scenario", async () => {
    const { settings, cache, registry, planner, identity } = setup();
    const config = await settings.getResolvedConfig();
    const providerId = "mock";

    for (const category of [
      "property_details",
      "property_valuation",
      "nearby_houses",
    ] as const) {
      const key =
        category === "nearby_houses"
          ? cache.nearbyKey(providerId, "nearby_houses", identity.normalizedKey, {
              kind: "residential",
              radiusMiles: 1,
              limit: 10,
            })
          : category === "property_valuation"
            ? cache.valuationKey(providerId, identity.normalizedKey)
            : cache.detailsKey(providerId, identity.normalizedKey);
      await cache.store({
        providerId,
        category,
        key,
        payload: category === "nearby_houses" ? { items: [{ id: 1 }] } : { ok: true },
        ttl: { redisTtlSeconds: 3600 },
      });
    }

    const plan = await planner.plan({
      identity,
      zipCode: "78244",
      config,
      registry,
      cache,
    });

    expect(plan.cacheHits.sort()).toEqual(
      ["nearby_houses", "property_details", "property_valuation"].sort()
    );
    expect(plan.toFetch.sort()).toEqual(
      ["market_statistics", "nearby_land"].sort()
    );
    expect(plan.operations.map((o) => o.category).sort()).toEqual(
      ["market_statistics", "nearby_land"].sort()
    );
  });

  it("defers details behind valuation when same provider mayAlsoProvide details", async () => {
    const { settings, cache, registry, planner, identity } = setup();
    const config = await settings.getResolvedConfig();

    const plan = await planner.plan({
      identity,
      zipCode: "78244",
      requestedCategories: ["property_details", "property_valuation"],
      config,
      registry,
      cache,
    });

    expect(plan.toFetch).toEqual(
      expect.arrayContaining(["property_details", "property_valuation"])
    );
    const valuationOp = plan.operations.find(
      (o) => o.category === "property_valuation"
    );
    const detailsOp = plan.operations.find(
      (o) => o.category === "property_details"
    );
    expect(valuationOp?.conditional).toBe(false);
    expect(valuationOp?.maySatisfyCategories).toContain("property_details");
    expect(detailsOp?.conditional).toBe(true);
    expect(detailsOp?.dependsOnCategory).toBe("property_valuation");
    expect(plan.operations[0]?.category).toBe("property_valuation");
  });

  it("does not plan disabled categories", async () => {
    const { settings, cache, registry, planner, identity } = setup();
    settings.setCategoryEnabled("nearby_land", false);
    const config = await settings.getResolvedConfig();

    const plan = await planner.plan({
      identity,
      zipCode: "78244",
      config,
      registry,
      cache,
    });

    expect(
      plan.categoryStates.find((s) => s.category === "nearby_land")?.disposition
    ).toBe("disabled");
    expect(plan.toFetch).not.toContain("nearby_land");
    expect(plan.operations.some((o) => o.category === "nearby_land")).toBe(
      false
    );
  });

  it("marks unsupported provider/category combinations", async () => {
    const { settings, cache, registry, planner, identity } = setup();
    settings.setCategoryProvider("market_statistics", "missing-provider");
    const config = await settings.getResolvedConfig();

    const plan = await planner.plan({
      identity,
      zipCode: "78244",
      requestedCategories: ["market_statistics"],
      config,
      registry,
      cache,
    });

    expect(
      plan.categoryStates.find((s) => s.category === "market_statistics")
        ?.disposition
    ).toBe("unsupported");
    expect(plan.operations).toHaveLength(0);
  });
});
