import { createProviderError } from "@/lib/property-intelligence/errors";
import {
  buildMockMarketStatistics,
  buildMockNearbyHouses,
  buildMockNearbyLand,
  buildMockPropertyDetails,
  buildMockValuation,
  getMockFixtureAddress,
} from "@/lib/property-intelligence/providers/mock/fixture-data";
import { unsupportedOutcome } from "@/lib/property-intelligence/providers/registry";
import { buildDataSource } from "@/lib/property-intelligence/providers/types";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";
import type {
  MarketStatistics,
  NearbyListing,
  NearbyListingsQuery,
  PropertyDataCategory,
  PropertyDetails,
  PropertyLookup,
  PropertyValuation,
  ProviderCapability,
  ProviderOutcome,
} from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

export type MockProviderScenario =
  | "success"
  | "partial"
  | "empty"
  | "unsupported_all"
  | "timeout"
  | "rate_limited"
  | "provider_failure";

export type MockProviderOptions = {
  scenario?: MockProviderScenario;
  unsupportedCategories?: PropertyDataCategory[];
  label?: string;
};

const MOCK_ATTRIBUTION =
  "MOCK DATA — Everlia RentCast capture fixture (not live market data)";

export class MockPropertyDataProvider implements PropertyDataProvider {
  readonly id = "mock" as const;
  readonly displayName: string;
  readonly isMock = true;

  private readonly scenario: MockProviderScenario;
  private readonly unsupported: Set<PropertyDataCategory>;

  constructor(options?: MockProviderOptions) {
    this.scenario = options?.scenario ?? "success";
    this.unsupported = new Set(options?.unsupportedCategories ?? []);
    this.displayName = options?.label ?? "Mock Property Provider";
  }

  capabilities(): ProviderCapability[] {
    return PROPERTY_DATA_CATEGORIES.map((category) => {
      const supported =
        this.scenario !== "unsupported_all" && !this.unsupported.has(category);
      return {
        category,
        supported,
        requiredInputs:
          category === "market_statistics" ? ["zip_code"] : ["address"],
        availableFields: supported
          ? ["rentcast_capture_fixture", getMockFixtureAddress()]
          : [],
        endpointCoverage: ["mock://rentcast-capture.fixture.json"],
        mayAlsoProvide:
          category === "property_valuation" && supported
            ? ["property_details"]
            : [],
        requestCostUnits: 1,
        retention: {
          maxDatabaseTtlSeconds: 3600,
          notes: "Mock data must not be persisted as production cache",
        },
        attribution: MOCK_ATTRIBUTION,
        publicDisplay: {
          allowed: false,
          notes: "Mock provider must never be selected for production public QR",
        },
        accessScope: "mock_only",
      };
    });
  }

  getCapability(category: PropertyDataCategory): ProviderCapability | null {
    return this.capabilities().find((c) => c.category === category) ?? null;
  }

  async getPropertyDetails(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyDetails>> {
    return this.run("property_details", input, () => {
      if (this.scenario === "empty" || this.scenario === "partial") {
        return {
          identity: input.identity,
          specifications: {
            bedrooms: null,
            bathrooms: null,
            livingArea: null,
            lotSize: null,
            yearBuilt: null,
            stories: null,
            garageSpaces: null,
            propertyType: "unknown",
          },
          county: null,
          lastSaleDate: null,
          lastSalePrice: null,
        };
      }

      return buildMockPropertyDetails(input);
    });
  }

  async getPropertyValuation(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyValuation>> {
    return this.run("property_valuation", input, () => {
      if (this.scenario === "empty") {
        return {
          estimate: null,
          range: { low: null, high: null },
          subjectDetails: null,
          comparables: [],
        };
      }

      if (this.scenario === "partial") {
        const full = buildMockValuation(input);
        return {
          ...full,
          subjectDetails: null,
          comparables: [],
        };
      }

      return buildMockValuation(input);
    });
  }

  async getNearbyResidentialListings(
    input: PropertyLookup,
    query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    return this.run("nearby_houses", input, () => {
      if (this.scenario === "empty" || this.scenario === "partial") return [];
      return buildMockNearbyHouses(input, query.limit ?? 10);
    });
  }

  async getNearbyLandListings(
    input: PropertyLookup,
    query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    return this.run("nearby_land", input, () => {
      if (this.scenario === "empty") return [];
      return buildMockNearbyLand(input, query.limit ?? 10);
    });
  }

  async getMarketStatistics(
    input: PropertyLookup
  ): Promise<ProviderOutcome<MarketStatistics>> {
    return this.run("market_statistics", input, () => {
      const zip =
        input.zipCode || input.identity.components.postalCode || "00000";
      if (this.scenario === "empty") {
        return { zipCode: zip, sale: null, rental: null, history: null };
      }
      return buildMockMarketStatistics(input);
    });
  }

  private async run<T>(
    category: PropertyDataCategory,
    _input: PropertyLookup,
    build: () => T
  ): Promise<ProviderOutcome<T>> {
    const capability = this.getCapability(category);
    if (!capability?.supported) {
      return unsupportedOutcome(this, category);
    }

    if (this.scenario === "timeout") {
      return {
        status: "error",
        error: createProviderError({
          code: "timeout",
          message: "Mock provider simulated timeout",
          providerId: this.id,
          category,
          retryable: true,
        }),
      };
    }

    if (this.scenario === "rate_limited") {
      return {
        status: "error",
        error: createProviderError({
          code: "rate_limited",
          message: "Mock provider simulated rate limit",
          providerId: this.id,
          category,
          retryable: true,
          httpStatus: 429,
        }),
      };
    }

    if (this.scenario === "provider_failure") {
      return {
        status: "error",
        error: createProviderError({
          code: "provider_failure",
          message: "Mock provider simulated upstream failure",
          providerId: this.id,
          category,
          retryable: true,
          httpStatus: 500,
        }),
      };
    }

    return {
      status: "ok",
      data: build(),
      source: buildDataSource({
        providerId: this.id,
        category,
        isMock: true,
        attribution: MOCK_ATTRIBUTION,
        accessScope: "mock_only",
        freshnessLabel: "mock",
        restrictions: [
          "MOCK DATA",
          "Never use as production Property Intelligence output",
        ],
      }),
    };
  }
}

export function createMockProvider(
  options?: MockProviderOptions
): PropertyDataProvider {
  return new MockPropertyDataProvider(options);
}
