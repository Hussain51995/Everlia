import {
  extractZipFromText,
  normalizeAreaSqft,
  normalizeCoordinates,
  normalizeIsoDate,
  normalizeListingStatus,
  normalizeMoney,
  normalizePropertyAddress,
  normalizePropertyType,
  toFiniteNumber,
} from "@/lib/property-intelligence/normalize";
import type {
  ComparableProperty,
  MarketHistoricalData,
  MarketMetricSet,
  MarketStatistics,
  NearbyListing,
  PropertyDetails,
  PropertyIdentity,
  PropertySpecifications,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import type {
  RentCastMarketsResponse,
  RentCastPropertyCore,
  RentCastSaleListing,
  RentCastValueEstimate,
} from "@/lib/property-intelligence/providers/rentcast/raw-schemas";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildIdentityFromRecord(
  record: RentCastPropertyCore,
  fallbackAddress?: string
): PropertyIdentity {
  const formatted =
    str(record.formattedAddress) ||
    [
      str(record.addressLine1),
      str(record.city),
      [str(record.state), str(record.zipCode)].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ") ||
    fallbackAddress ||
    "";

  const base = normalizePropertyAddress(formatted);
  const unitFromLine2 = str(record.addressLine2);
  const coords = normalizeCoordinates(record.latitude, record.longitude);

  return {
    ...base,
    components: {
      ...base.components,
      formatted: formatted || base.components.formatted,
      line1: str(record.addressLine1) ?? base.components.line1,
      line2: unitFromLine2,
      unit: base.components.unit,
      city: str(record.city) ?? base.components.city,
      adminArea: str(record.state)?.toUpperCase() ?? base.components.adminArea,
      postalCode: str(record.zipCode) ?? base.components.postalCode,
      countryCode: "US",
    },
    providerPropertyId: str(record.id),
    coordinates: coords,
  };
}

function mapSpecifications(record: RentCastPropertyCore): PropertySpecifications {
  const features =
    record && typeof record === "object" && "features" in record
      ? ((record as { features?: Record<string, unknown> }).features ?? null)
      : null;
  const garageFromFeatures = toFiniteNumber(features?.garageSpaces);
  const storiesFromFeatures = toFiniteNumber(features?.floorCount);
  const garageTop = toFiniteNumber(
    (record as { garageSpaces?: unknown }).garageSpaces
  );
  const storiesTop = toFiniteNumber(
    (record as { floorCount?: unknown }).floorCount
  );

  return {
    bedrooms: toFiniteNumber(record.bedrooms),
    bathrooms: toFiniteNumber(record.bathrooms),
    livingArea: normalizeAreaSqft(record.squareFootage),
    lotSize: normalizeAreaSqft(record.lotSize),
    yearBuilt: toFiniteNumber(record.yearBuilt),
    stories: storiesTop ?? storiesFromFeatures,
    garageSpaces: garageTop ?? garageFromFeatures,
    propertyType: normalizePropertyType(record.propertyType),
  };
}

export function mapRentCastPropertyDetails(
  record: RentCastPropertyCore,
  fallbackAddress?: string
): PropertyDetails {
  return {
    identity: buildIdentityFromRecord(record, fallbackAddress),
    specifications: mapSpecifications(record),
    county: str(record.county),
    lastSaleDate: normalizeIsoDate(record.lastSaleDate),
    lastSalePrice: normalizeMoney(record.lastSalePrice),
  };
}

export function pickPrimaryPropertyRecord(
  data: RentCastPropertyCore | RentCastPropertyCore[]
): RentCastPropertyCore | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}

export function mapRentCastValuation(
  raw: RentCastValueEstimate,
  fallbackAddress?: string
): PropertyValuation {
  const subject = raw.subjectProperty
    ? mapRentCastPropertyDetails(raw.subjectProperty, fallbackAddress)
    : null;

  const comparables: ComparableProperty[] = (raw.comparables ?? [])
    .filter(Boolean)
    .map((c) => mapComparable(c));

  return {
    estimate: normalizeMoney(raw.price),
    range: {
      low: normalizeMoney(raw.priceRangeLow),
      high: normalizeMoney(raw.priceRangeHigh),
    },
    subjectDetails: subject,
    comparables,
  };
}

function mapComparable(record: RentCastSaleListing): ComparableProperty {
  return {
    identity: buildIdentityFromRecord(record),
    specifications: mapSpecifications(record),
    listPrice: normalizeMoney(record.price),
    status: normalizeListingStatus(record.status),
    listedDate: normalizeIsoDate(record.listedDate),
    removedDate: normalizeIsoDate(record.removedDate),
    daysOnMarket: toFiniteNumber(record.daysOnMarket),
    distanceMiles: toFiniteNumber(record.distance),
    correlation: toFiniteNumber(record.correlation),
  };
}

export function mapRentCastListing(record: RentCastSaleListing): NearbyListing {
  return {
    identity: buildIdentityFromRecord(record),
    specifications: mapSpecifications(record),
    listPrice: normalizeMoney(record.price),
    status: normalizeListingStatus(record.status),
    listedDate: normalizeIsoDate(record.listedDate),
    removedDate: normalizeIsoDate(record.removedDate),
    daysOnMarket: toFiniteNumber(record.daysOnMarket),
    distanceMiles: toFiniteNumber(record.distance),
    listingType: str(record.listingType),
  };
}

export function extractSaleListingsArray(data: unknown): RentCastSaleListing[] {
  if (Array.isArray(data)) return data as RentCastSaleListing[];
  if (data && typeof data === "object") {
    const obj = data as { listings?: unknown; data?: unknown };
    if (Array.isArray(obj.listings)) return obj.listings as RentCastSaleListing[];
    if (Array.isArray(obj.data)) return obj.data as RentCastSaleListing[];
  }
  return [];
}

function mapMarketMetrics(block: Record<string, unknown> | null | undefined): MarketMetricSet | null {
  if (!block) return null;
  return {
    averagePrice: normalizeMoney(block.averagePrice ?? block.averageRent),
    medianPrice: normalizeMoney(block.medianPrice ?? block.medianRent),
    minPrice: normalizeMoney(block.minPrice ?? block.minRent),
    maxPrice: normalizeMoney(block.maxPrice ?? block.maxRent),
    averagePricePerSqft: normalizeMoney(
      block.averagePricePerSquareFoot ?? block.averageRentPerSquareFoot
    ),
    medianPricePerSqft: normalizeMoney(
      block.medianPricePerSquareFoot ?? block.medianRentPerSquareFoot
    ),
    averageDaysOnMarket: toFiniteNumber(block.averageDaysOnMarket),
    medianDaysOnMarket: toFiniteNumber(block.medianDaysOnMarket),
    totalListings: toFiniteNumber(block.totalListings),
    newListings: toFiniteNumber(block.newListings),
  };
}

export function normalizeRentCastHistory(
  history: unknown
): Array<Record<string, unknown>> | null {
  if (!history) return null;
  if (Array.isArray(history)) {
    return history.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object"
    );
  }
  if (typeof history === "object") {
    return Object.values(history as Record<string, unknown>).filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object"
    );
  }
  return null;
}

function mapHistory(history: unknown): MarketHistoricalData | null {
  const entries = normalizeRentCastHistory(history);
  if (!entries?.length) return null;
  const series = entries
    .map((entry) => {
      const periodStart = normalizeIsoDate(entry.date);
      if (!periodStart) return null;
      return {
        periodStart,
        metrics: mapMarketMetrics(entry) ?? {
          averagePrice: null,
          medianPrice: null,
          minPrice: null,
          maxPrice: null,
          averagePricePerSqft: null,
          medianPricePerSqft: null,
          averageDaysOnMarket: null,
          medianDaysOnMarket: null,
          totalListings: null,
          newListings: null,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort(
      (a, b) => Date.parse(a.periodStart) - Date.parse(b.periodStart)
    );

  return series.length ? { series } : null;
}

export function mapRentCastMarketStatistics(
  raw: RentCastMarketsResponse,
  fallbackZip: string | null
): MarketStatistics {
  const zip =
    str(raw.zipCode) ||
    extractZipFromText(str(raw.id)) ||
    fallbackZip ||
    "";

  const saleBlock = (raw.saleData ?? null) as Record<string, unknown> | null;
  const rentalBlock = (raw.rentalData ?? null) as Record<string, unknown> | null;

  const legacySale =
    !saleBlock &&
    (raw.averagePrice != null || raw.medianPrice != null || raw.history)
      ? (raw as Record<string, unknown>)
      : null;

  const sale = mapMarketMetrics(saleBlock ?? legacySale);
  const rental = mapMarketMetrics(rentalBlock);
  const history = mapHistory(
    saleBlock?.history ?? raw.history ?? null
  );

  return {
    zipCode: zip,
    sale,
    rental,
    history,
  };
}

export function stripSensitiveRentCastFields(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(stripSensitiveRentCastFields);
  }
  if (!data || typeof data !== "object") return data;

  const blocked = new Set([
    "owner",
    "owner1FullName",
    "owner1LastName",
    "owner1FirstName",
    "owner2FullName",
    "ownerOccupied",
    "ownerMailingAddress",
    "listingAgent",
    "listingOffice",
    "builderName",
    "agent",
    "office",
    "email",
    "phone",
    "phoneNumber",
  ]);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (blocked.has(k)) continue;
    if (/^(owner|agent|broker|builder)/i.test(k) && typeof v === "object") {
      continue;
    }
    out[k] = stripSensitiveRentCastFields(v);
  }
  return out;
}
