import { describe, expect, it } from "vitest";
import {
  createMockProvider,
  createPropertyProviderRegistry,
  createRentCastProvider,
  PropertyProviderRegistry,
} from "@/lib/property-intelligence";
import type { RentCastHttpClient } from "@/lib/property-intelligence/providers/rentcast/http";
import {
  rentCastMarketStatisticsFixture,
  rentCastNearbyHousesFixture,
  rentCastNearbyLandFixture,
  rentCastPropertyDetailsFixture,
  rentCastValuationFixture,
} from "@/lib/property-intelligence/providers/rentcast/fixtures";
import {
  defaultLandQuery,
  defaultResidentialQuery,
  makeLookup,
} from "@/lib/property-intelligence/test-helpers";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";

function fixtureHttp(): RentCastHttpClient {
  return {
    async get(path) {
      const map: Record<string, unknown> = {
        "/properties": rentCastPropertyDetailsFixture,
        "/avm/value": rentCastValuationFixture,
        "/listings/sale":
          path.includes("sale") ? rentCastNearbyHousesFixture : [],
        "/markets": rentCastMarketStatisticsFixture,
      };
      return { ok: true, httpStatus: 200, data: map[path] ?? null };
    },
  };
}

async function assertContractSurface(provider: PropertyDataProvider) {
  expect(provider.id).toBeTruthy();
  expect(typeof provider.displayName).toBe("string");
  expect(typeof provider.isMock).toBe("boolean");
  const caps = provider.capabilities();
  expect(caps.length).toBeGreaterThan(0);
  for (const category of PROPERTY_DATA_CATEGORIES) {
    const cap = provider.getCapability(category);
    expect(cap === null || typeof cap.supported === "boolean").toBe(true);
  }
}

describe("PropertyDataProvider contract", () => {
  it("mock provider satisfies contract and labels mock sources", async () => {
    const provider = createMockProvider({ scenario: "success" });
    await assertContractSurface(provider);
    expect(provider.isMock).toBe(true);

    const lookup = makeLookup();
    const details = await provider.getPropertyDetails(lookup);
    expect(details.status).toBe("ok");
    if (details.status === "ok") {
      expect(details.source.isMock).toBe(true);
      expect(details.source.attribution).toMatch(/MOCK/i);
    }
  });

  it("mock scenarios: empty, unsupported, timeout, rate limit, failure", async () => {
    const lookup = makeLookup();

    const empty = createMockProvider({ scenario: "empty" });
    const emptyVal = await empty.getPropertyValuation(lookup);
    expect(emptyVal.status).toBe("ok");
    if (emptyVal.status === "ok") {
      expect(emptyVal.data.estimate).toBeNull();
      expect(emptyVal.data.comparables).toEqual([]);
    }

    const unsupported = createMockProvider({
      unsupportedCategories: ["nearby_land"],
    });
    const land = await unsupported.getNearbyLandListings(
      lookup,
      defaultLandQuery()
    );
    expect(land.status).toBe("unsupported");

    const timeout = createMockProvider({ scenario: "timeout" });
    const t = await timeout.getPropertyDetails(lookup);
    expect(t.status).toBe("error");
    if (t.status === "error") expect(t.error.code).toBe("timeout");

    const limited = createMockProvider({ scenario: "rate_limited" });
    const r = await limited.getPropertyDetails(lookup);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.error.code).toBe("rate_limited");

    const fail = createMockProvider({ scenario: "provider_failure" });
    const f = await fail.getMarketStatistics(lookup);
    expect(f.status).toBe("error");
    if (f.status === "error") expect(f.error.code).toBe("provider_failure");
  });

  it("RentCast adapter with fixture HTTP satisfies contract for all categories", async () => {
    const provider = createRentCastProvider({ http: fixtureHttp() });
    await assertContractSurface(provider);
    expect(provider.isMock).toBe(false);

    const lookup = makeLookup();
    const details = await provider.getPropertyDetails(lookup);
    const valuation = await provider.getPropertyValuation(lookup);
    const houses = await provider.getNearbyResidentialListings(
      lookup,
      defaultResidentialQuery()
    );
    const landProvider = createRentCastProvider({
      http: {
        async get() {
          return {
            ok: true,
            httpStatus: 200,
            data: rentCastNearbyLandFixture,
          };
        },
      },
    });
    const land = await landProvider.getNearbyLandListings(
      lookup,
      defaultLandQuery()
    );
    const market = await provider.getMarketStatistics(lookup);

    for (const result of [details, valuation, houses, land, market]) {
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.source.providerId).toBe("rentcast");
        expect(result.source.isMock).toBe(false);
      }
    }
  });
});

describe("PropertyProviderRegistry", () => {
  it("registers providers and resolves per-category selection independently", () => {
    const registry = new PropertyProviderRegistry({
      defaultProviderId: "rentcast",
      categoryProviders: {
        property_details: "rentcast",
        property_valuation: "mock",
      },
    });
    registry.register(createRentCastProvider({ http: fixtureHttp() }));
    registry.register(createMockProvider());

    expect(registry.resolveProviderId("property_details")).toBe("rentcast");
    expect(registry.resolveProviderId("property_valuation")).toBe("mock");
    expect(registry.resolveProviderId("nearby_houses")).toBe("rentcast");

    const resolved = registry.resolveForCategory("property_valuation");
    expect(resolved.provider.id).toBe("mock");
    expect(resolved.capability.supported).toBe(true);
  });

  it("rejects unsupported provider/category combinations", () => {
    const registry = new PropertyProviderRegistry({
      defaultProviderId: "mock",
      categoryProviders: { nearby_land: "mock" },
    });
    registry.register(
      createMockProvider({ unsupportedCategories: ["nearby_land"] })
    );

    expect(() => registry.resolveForCategory("nearby_land")).toThrow(
      /does not support/
    );
  });

  it("validateConfiguration reports missing registrations", () => {
    const registry = createPropertyProviderRegistry({ includeMock: false });
    const result = registry.validateConfiguration({
      market_statistics: "zillow",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("zillow"))).toBe(true);
  });

  it("does not require RentCast conditionals for category routing", () => {
    const registry = createPropertyProviderRegistry({
      includeMock: true,
      defaultProviderId: "mock",
      categoryProviders: {
        property_details: "mock",
        property_valuation: "mock",
        nearby_houses: "mock",
        nearby_land: "mock",
        market_statistics: "mock",
      },
    });
    const check = registry.validateConfiguration();
    expect(check.ok).toBe(true);
    for (const category of PROPERTY_DATA_CATEGORIES) {
      expect(registry.resolveForCategory(category).provider.id).toBe("mock");
    }
  });
});
