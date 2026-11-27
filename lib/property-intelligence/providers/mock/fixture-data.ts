import capture from "@/lib/property-intelligence/providers/mock/rentcast-capture.fixture.json";
import {
  mapRentCastListing,
  mapRentCastMarketStatistics,
  mapRentCastPropertyDetails,
  mapRentCastValuation,
  pickPrimaryPropertyRecord,
} from "@/lib/property-intelligence/providers/rentcast/map-property";
import type {
  MarketStatistics,
  NearbyListing,
  PropertyDetails,
  PropertyLookup,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import type {
  RentCastMarketsResponse,
  RentCastPropertyCore,
  RentCastSaleListing,
  RentCastValueEstimate,
} from "@/lib/property-intelligence/providers/rentcast/raw-schemas";

const FALLBACK_ADDRESS =
  typeof capture.meta?.inputAddress === "string"
    ? capture.meta.inputAddress
    : "5500 Grand Lake Dr, San Antonio, TX 78244";

export function getMockFixtureAddress(): string {
  return FALLBACK_ADDRESS;
}

export function buildMockPropertyDetails(
  input: PropertyLookup
): PropertyDetails {
  const primary = pickPrimaryPropertyRecord(
    capture.propertyDetails as RentCastPropertyCore[]
  );
  if (!primary) {
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

  const mapped = mapRentCastPropertyDetails(
    primary,
    input.address?.trim() || FALLBACK_ADDRESS
  );

  return {
    ...mapped,
    identity: {
      ...mapped.identity,
      normalizedKey:
        input.identity.normalizedKey || mapped.identity.normalizedKey,
    },
  };
}

export function buildMockValuation(input: PropertyLookup): PropertyValuation {
  return mapRentCastValuation(
    capture.valuation as RentCastValueEstimate,
    input.address?.trim() || FALLBACK_ADDRESS
  );
}

export function buildMockNearbyHouses(
  _input: PropertyLookup,
  limit: number
): NearbyListing[] {
  return (capture.nearbyHouses as RentCastSaleListing[])
    .map((row) => mapRentCastListing(row))
    .slice(0, Math.max(1, limit));
}

export function buildMockNearbyLand(
  _input: PropertyLookup,
  limit: number
): NearbyListing[] {
  return (capture.nearbyLand as RentCastSaleListing[])
    .map((row) => mapRentCastListing(row))
    .slice(0, Math.max(1, limit));
}

export function buildMockMarketStatistics(
  input: PropertyLookup
): MarketStatistics {
  const zip =
    input.zipCode ||
    input.identity.components.postalCode ||
    (capture.marketStatistics.zipCode as string) ||
    "78244";

  return mapRentCastMarketStatistics(
    capture.marketStatistics as RentCastMarketsResponse,
    zip
  );
}
