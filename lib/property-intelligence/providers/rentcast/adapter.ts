import { createProviderError } from "@/lib/property-intelligence/errors";
import { extractZipFromText } from "@/lib/property-intelligence/normalize";
import { unsupportedOutcome } from "@/lib/property-intelligence/providers/registry";
import {
  getRentCastCapability,
  RENTCAST_CAPABILITIES,
} from "@/lib/property-intelligence/providers/rentcast/capabilities";
import {
  createRentCastHttpClient,
  type RentCastHttpClient,
} from "@/lib/property-intelligence/providers/rentcast/http";
import {
  extractSaleListingsArray,
  mapRentCastListing,
  mapRentCastMarketStatistics,
  mapRentCastPropertyDetails,
  mapRentCastValuation,
  pickPrimaryPropertyRecord,
  stripSensitiveRentCastFields,
} from "@/lib/property-intelligence/providers/rentcast/map-property";
import {
  rentCastMarketsResponseSchema,
  rentCastPropertyRecordsResponseSchema,
  rentCastSaleListingsResponseSchema,
  rentCastValueEstimateSchema,
} from "@/lib/property-intelligence/providers/rentcast/raw-schemas";
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
  ProviderOutcome,
} from "@/lib/types/property-intelligence";

const RESIDENTIAL_TYPES =
  "Single Family|Condo|Townhouse|Multi-Family|Manufactured";

export type RentCastAdapterOptions = {
  http?: RentCastHttpClient;
};

export class RentCastPropertyDataProvider implements PropertyDataProvider {
  readonly id = "rentcast" as const;
  readonly displayName = "RentCast";
  readonly isMock = false;

  private readonly http: RentCastHttpClient;

  constructor(options?: RentCastAdapterOptions) {
    this.http = options?.http ?? createRentCastHttpClient();
  }

  capabilities() {
    return RENTCAST_CAPABILITIES;
  }

  getCapability(category: PropertyDataCategory) {
    return getRentCastCapability(category);
  }

  async getPropertyDetails(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyDetails>> {
    const capability = this.getCapability("property_details");
    if (!capability?.supported) {
      return unsupportedOutcome(this, "property_details");
    }

    const address = input.address?.trim();
    if (!address) {
      return this.invalidInput("property_details", "address is required");
    }

    const result = await this.http.get("/properties", { address });
    if (!result.ok) {
      return { status: "error", error: { ...result.error, category: "property_details" } };
    }

    const stripped = stripSensitiveRentCastFields(result.data);
    const parsed = rentCastPropertyRecordsResponseSchema.safeParse(stripped);
    if (!parsed.success) {
      return this.validationFailed("property_details", parsed.error.message);
    }

    const primary = pickPrimaryPropertyRecord(parsed.data);
    if (!primary) {
      return {
        status: "error",
        error: createProviderError({
          code: "not_found",
          message: "No property record found for address",
          providerId: this.id,
          category: "property_details",
          retryable: false,
          httpStatus: result.httpStatus,
        }),
      };
    }

    return {
      status: "ok",
      data: mapRentCastPropertyDetails(primary, address),
      source: buildDataSource({
        providerId: this.id,
        category: "property_details",
        isMock: false,
        attribution: capability.attribution,
        accessScope: capability.accessScope,
        restrictions: [
          "Owner and mailing-owner PII stripped",
          "Not an appraisal",
        ],
      }),
    };
  }

  async getPropertyValuation(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyValuation>> {
    const capability = this.getCapability("property_valuation");
    if (!capability?.supported) {
      return unsupportedOutcome(this, "property_valuation");
    }

    const address = input.address?.trim();
    if (!address) {
      return this.invalidInput("property_valuation", "address is required");
    }

    const result = await this.http.get("/avm/value", {
      address,
      compCount: 5,
      lookupSubjectAttributes: true,
    });
    if (!result.ok) {
      return {
        status: "error",
        error: { ...result.error, category: "property_valuation" },
      };
    }

    const stripped = stripSensitiveRentCastFields(result.data);
    const parsed = rentCastValueEstimateSchema.safeParse(stripped);
    if (!parsed.success) {
      return this.validationFailed("property_valuation", parsed.error.message);
    }

    return {
      status: "ok",
      data: mapRentCastValuation(parsed.data, address),
      source: buildDataSource({
        providerId: this.id,
        category: "property_valuation",
        isMock: false,
        attribution: capability.attribution,
        accessScope: capability.accessScope,
        freshnessLabel: "AVM estimate at retrieval time",
        restrictions: [
          "Estimate only — not an appraisal",
          "Subject details may accompany valuation (mayAlsoProvide property_details)",
        ],
      }),
    };
  }

  async getNearbyResidentialListings(
    input: PropertyLookup,
    query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    return this.fetchListings(input, query, {
      category: "nearby_houses",
      propertyType: RESIDENTIAL_TYPES,
      defaultRadius: 1,
    });
  }

  async getNearbyLandListings(
    input: PropertyLookup,
    query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    return this.fetchListings(input, query, {
      category: "nearby_land",
      propertyType: "Land",
      defaultRadius: 5,
    });
  }

  async getMarketStatistics(
    input: PropertyLookup
  ): Promise<ProviderOutcome<MarketStatistics>> {
    const capability = this.getCapability("market_statistics");
    if (!capability?.supported) {
      return unsupportedOutcome(this, "market_statistics");
    }

    const zipCode =
      input.zipCode ||
      input.identity.components.postalCode ||
      extractZipFromText(input.address);

    if (!zipCode) {
      return this.invalidInput(
        "market_statistics",
        "ZIP code is required for market statistics"
      );
    }

    const result = await this.http.get("/markets", {
      zipCode,
      dataType: "All",
    });
    if (!result.ok) {
      return {
        status: "error",
        error: { ...result.error, category: "market_statistics" },
      };
    }

    const parsed = rentCastMarketsResponseSchema.safeParse(result.data);
    if (!parsed.success) {
      return this.validationFailed("market_statistics", parsed.error.message);
    }

    return {
      status: "ok",
      data: mapRentCastMarketStatistics(parsed.data, zipCode),
      source: buildDataSource({
        providerId: this.id,
        category: "market_statistics",
        isMock: false,
        attribution: capability.attribution,
        accessScope: capability.accessScope,
        freshnessLabel: "Market aggregates; current month updates daily per RentCast",
      }),
    };
  }

  private async fetchListings(
    input: PropertyLookup,
    query: NearbyListingsQuery,
    opts: {
      category: "nearby_houses" | "nearby_land";
      propertyType: string;
      defaultRadius: number;
    }
  ): Promise<ProviderOutcome<NearbyListing[]>> {
    const capability = this.getCapability(opts.category);
    if (!capability?.supported) {
      return unsupportedOutcome(this, opts.category);
    }

    const address = input.address?.trim();
    if (!address) {
      return this.invalidInput(opts.category, "address is required");
    }

    const radius = query.radiusMiles > 0 ? query.radiusMiles : opts.defaultRadius;
    const limit = query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const result = await this.http.get("/listings/sale", {
      address,
      propertyType: opts.propertyType,
      status: "Active",
      radius,
      limit,
    });
    if (!result.ok) {
      return {
        status: "error",
        error: { ...result.error, category: opts.category },
      };
    }

    const stripped = stripSensitiveRentCastFields(result.data);
    const parsed = rentCastSaleListingsResponseSchema.safeParse(stripped);
    if (!parsed.success) {
      return this.validationFailed(opts.category, parsed.error.message);
    }

    const listings = extractSaleListingsArray(parsed.data).map(mapRentCastListing);

    return {
      status: "ok",
      data: listings,
      source: buildDataSource({
        providerId: this.id,
        category: opts.category,
        isMock: false,
        attribution: capability.attribution,
        accessScope: capability.accessScope,
        restrictions: [
          "Listing agent/office/builder contact fields stripped",
        ],
      }),
    };
  }

  private invalidInput(
    category: PropertyDataCategory,
    message: string
  ): ProviderOutcome<never> {
    return {
      status: "error",
      error: createProviderError({
        code: "invalid_input",
        message,
        providerId: this.id,
        category,
        retryable: false,
      }),
    };
  }

  private validationFailed(
    category: PropertyDataCategory,
    message: string
  ): ProviderOutcome<never> {
    return {
      status: "error",
      error: createProviderError({
        code: "validation_failed",
        message: `RentCast response failed validation: ${message}`,
        providerId: this.id,
        category,
        retryable: false,
      }),
    };
  }
}

export function createRentCastProvider(
  options?: RentCastAdapterOptions
): PropertyDataProvider {
  return new RentCastPropertyDataProvider(options);
}
