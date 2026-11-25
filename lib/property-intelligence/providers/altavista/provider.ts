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
import {
  mapAltavistaDetails,
  mapAltavistaMarket,
  mapAltavistaValuation,
} from "./map";
import {
  ALTAVISTA_DETAILS_FIXTURE,
  ALTAVISTA_MARKET_FIXTURE,
  ALTAVISTA_VALUATION_FIXTURE,
} from "./raw";

const ATTRIBUTION =
  "ALTAVISTA FIXTURE — deterministic replacement-test provider (not a live data source)";

export class AltavistaPropertyDataProvider implements PropertyDataProvider {
  readonly id = "altavista" as const;
  readonly displayName = "Altavista Test Provider";
  readonly isMock = true;

  private callCounts: Record<string, number> = {};

  getCallCounts(): Record<string, number> {
    return { ...this.callCounts };
  }

  resetCallCounts(): void {
    this.callCounts = {};
  }

  private bump(op: string) {
    this.callCounts[op] = (this.callCounts[op] ?? 0) + 1;
  }

  capabilities(): ProviderCapability[] {
    const supported = new Set<PropertyDataCategory>([
      "property_details",
      "property_valuation",
      "market_statistics",
    ]);
    const all: PropertyDataCategory[] = [
      "property_details",
      "property_valuation",
      "nearby_houses",
      "nearby_land",
      "market_statistics",
    ];
    return all.map((category) => {
      const ok = supported.has(category);
      return {
        category,
        supported: ok,
        requiredInputs:
          category === "market_statistics" ? ["zip_code"] : ["address"],
        availableFields: ok ? ["altavista_mapped"] : [],
        endpointCoverage: ok
          ? [`altavista://v2/${category.replace(/_/g, "-")}`]
          : [],
        mayAlsoProvide: [],
        requestCostUnits: category === "property_valuation" ? 2 : 1,
        retention: {
          maxDatabaseTtlSeconds: ok ? 7 * 24 * 60 * 60 : null,
          notes: ok
            ? "Altavista fixture retention capped at 7 days for replacement tests"
            : null,
        },
        attribution: ATTRIBUTION,
        publicDisplay: {
          allowed: false,
          notes: "Test fixture only — never select for production public QR",
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
    this.bump("getPropertyDetails");
    const capability = this.getCapability("property_details");
    if (!capability?.supported) return unsupportedOutcome(this, "property_details");
    return {
      status: "ok",
      data: mapAltavistaDetails(ALTAVISTA_DETAILS_FIXTURE, input),
      source: buildDataSource({
        providerId: this.id,
        category: "property_details",
        isMock: true,
        providerDataset: "altavista.bundle.v2",
        attribution: ATTRIBUTION,
        sourceDataAt: "2026-01-10T00:00:00.000Z",
      }),
    };
  }

  async getPropertyValuation(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyValuation>> {
    this.bump("getPropertyValuation");
    void input;
    const capability = this.getCapability("property_valuation");
    if (!capability?.supported) {
      return unsupportedOutcome(this, "property_valuation");
    }
    return {
      status: "ok",
      data: mapAltavistaValuation(ALTAVISTA_VALUATION_FIXTURE),
      source: buildDataSource({
        providerId: this.id,
        category: "property_valuation",
        isMock: true,
        providerDataset: "altavista.avm.v2",
        attribution: ATTRIBUTION,
        sourceDataAt: ALTAVISTA_VALUATION_FIXTURE.result_set.avm_node.as_of,
      }),
    };
  }

  async getNearbyResidentialListings(
    _input: PropertyLookup,
    _query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    this.bump("getNearbyResidentialListings");
    return unsupportedOutcome(this, "nearby_houses");
  }

  async getNearbyLandListings(
    _input: PropertyLookup,
    _query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    this.bump("getNearbyLandListings");
    return unsupportedOutcome(this, "nearby_land");
  }

  async getMarketStatistics(
    input: PropertyLookup
  ): Promise<ProviderOutcome<MarketStatistics>> {
    this.bump("getMarketStatistics");
    const capability = this.getCapability("market_statistics");
    if (!capability?.supported) {
      return unsupportedOutcome(this, "market_statistics");
    }
    const data = mapAltavistaMarket(ALTAVISTA_MARKET_FIXTURE);
    if (input.zipCode) data.zipCode = input.zipCode;
    return {
      status: "ok",
      data,
      source: buildDataSource({
        providerId: this.id,
        category: "market_statistics",
        isMock: true,
        providerDataset: "altavista.market.v2",
        attribution: ATTRIBUTION,
      }),
    };
  }
}

export function createAltavistaProvider(): AltavistaPropertyDataProvider {
  return new AltavistaPropertyDataProvider();
}
