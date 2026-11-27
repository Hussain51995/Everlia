

export const PROPERTY_DATA_CATEGORIES = [
  "property_details",
  "property_valuation",
  "nearby_houses",
  "nearby_land",
  "market_statistics",
] as const;

export type PropertyDataCategory = (typeof PROPERTY_DATA_CATEGORIES)[number];

export const PROPERTY_PROVIDER_IDS = ["rentcast", "mock"] as const;
export type PropertyProviderId = (typeof PROPERTY_PROVIDER_IDS)[number] | (string & {});

export type MoneyAmount = {
  amount: number;
  currency: "USD";
};

export type AreaMeasurement = {
  value: number;
  unit: "sqft" | "acre";
};

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

export type ListingStatus =
  | "active"
  | "inactive"
  | "pending"
  | "sold"
  | "unknown";

export type NormalizedPropertyType =
  | "single_family"
  | "condo"
  | "townhouse"
  | "multi_family"
  | "manufactured"
  | "apartment"
  | "land"
  | "other"
  | "unknown";

export type PropertyAddressComponents = {
  formatted: string | null;
  line1: string | null;
  line2: string | null;
  unit: string | null;
  city: string | null;
  adminArea: string | null;
  postalCode: string | null;
  countryCode: string;
};

export type PropertyIdentity = {
  normalizedKey: string;
  components: PropertyAddressComponents;
  providerPropertyId: string | null;
  coordinates: GeoCoordinates | null;
};

export type PropertyLookup = {
  address: string;
  identity: PropertyIdentity;
  zipCode: string | null;
  organizationId: string | null;
  customerId: string | null;
  categories?: PropertyDataCategory[];
};

export type PropertySpecifications = {
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: AreaMeasurement | null;
  lotSize: AreaMeasurement | null;
  yearBuilt: number | null;
  stories: number | null;
  garageSpaces: number | null;
  propertyType: NormalizedPropertyType;
};

export type PropertyDetails = {
  identity: PropertyIdentity;
  specifications: PropertySpecifications;
  county: string | null;
  lastSaleDate: string | null;
  lastSalePrice: MoneyAmount | null;
};

export type PropertyValueRange = {
  low: MoneyAmount | null;
  high: MoneyAmount | null;
};

export type ComparableProperty = {
  identity: PropertyIdentity;
  specifications: PropertySpecifications;
  listPrice: MoneyAmount | null;
  status: ListingStatus;
  listedDate: string | null;
  removedDate: string | null;
  daysOnMarket: number | null;
  distanceMiles: number | null;
  correlation: number | null;
};

export type PropertyValuation = {
  estimate: MoneyAmount | null;
  range: PropertyValueRange;
  subjectDetails: PropertyDetails | null;
  comparables: ComparableProperty[];
};

export type NearbyListingsQuery = {
  kind: "residential" | "land";
  radiusMiles: number;
  limit: number;
  status?: ListingStatus | "active";
  propertyTypes?: NormalizedPropertyType[];
};

export type NearbyListing = {
  identity: PropertyIdentity;
  specifications: PropertySpecifications;
  listPrice: MoneyAmount | null;
  status: ListingStatus;
  listedDate: string | null;
  removedDate: string | null;
  daysOnMarket: number | null;
  distanceMiles: number | null;
  listingType: string | null;
};

export type MarketMetricSet = {
  averagePrice: MoneyAmount | null;
  medianPrice: MoneyAmount | null;
  minPrice: MoneyAmount | null;
  maxPrice: MoneyAmount | null;
  averagePricePerSqft: MoneyAmount | null;
  medianPricePerSqft: MoneyAmount | null;
  averageDaysOnMarket: number | null;
  medianDaysOnMarket: number | null;
  totalListings: number | null;
  newListings: number | null;
};

export type MarketHistoricalPoint = {
  periodStart: string;
  metrics: MarketMetricSet;
};

export type MarketHistoricalData = {
  series: MarketHistoricalPoint[];
};

export type MarketStatistics = {
  zipCode: string;
  sale: MarketMetricSet | null;
  rental: MarketMetricSet | null;
  history: MarketHistoricalData | null;
};

export type PropertyDataSource = {
  providerId: PropertyProviderId;
  providerDataset: string | null;
  category: PropertyDataCategory;
  retrievedAt: string;
  sourceDataAt: string | null;
  attribution: string | null;
  freshnessLabel: string | null;
  accessScope: string;
  schemaVersion: number;
  isMock: boolean;
  restrictions: string[];
};

export type ProviderErrorCode =
  | "unsupported_capability"
  | "invalid_input"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "provider_failure"
  | "validation_failed"
  | "configuration_error"
  | "budget_denied";

export type ProviderError = {
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  providerId: PropertyProviderId;
  category?: PropertyDataCategory;
  httpStatus?: number | null;
};

export type ProviderSuccess<T> = {
  status: "ok";
  data: T;
  source: PropertyDataSource;
};

export type ProviderUnsupported = {
  status: "unsupported";
  error: ProviderError;
};

export type ProviderFailure = {
  status: "error";
  error: ProviderError;
};

export type ProviderOutcome<T> =
  | ProviderSuccess<T>
  | ProviderUnsupported
  | ProviderFailure;

export type ProviderRequiredInput =
  | "address"
  | "zip_code"
  | "coordinates"
  | "provider_property_id";

export type ProviderCapability = {
  category: PropertyDataCategory;
  supported: boolean;
  requiredInputs: ProviderRequiredInput[];
  availableFields: string[];
  endpointCoverage: string[];
  mayAlsoProvide: PropertyDataCategory[];
  requestCostUnits?: number;
  retention: {
    maxRedisTtlSeconds: number | null;
    notes: string | null;
  };
  attribution: string | null;
  publicDisplay: {
    allowed: boolean;
    notes: string | null;
  };
  accessScope: string;
};

export type CategoryResultStatus =
  | "available"
  | "disabled"
  | "missing"
  | "loading"
  | "unavailable"
  | "unsupported"
  | "expired"
  | "rate_limited"
  | "budget_exhausted"
  | "error";

export type PropertyCategoryResult<T> = {
  category: PropertyDataCategory;
  status: CategoryResultStatus;
  data: T | null;
  source: PropertyDataSource | null;
  error: ProviderError | null;
  cache?: {
    hit: boolean;
    serverCacheHit?: boolean;
    fetchedAt: string | null;
    expiresAt: string | null;
    remainingTtlSeconds: number | null;
    isNegative: boolean;
    configVersion?: number | null;
  } | null;
};

export type PropertyIntelligenceCachePolicyMeta = {
  globalConfigVersion: number;
  categoryConfigVersions: Record<PropertyDataCategory, number>;
  staleDisplayPermitted: false;
};

export type PropertyIntelligenceResult = {
  featureEnabled: boolean;
  identity: PropertyIdentity | null;
  retrievedAt: string;
  cachePolicy?: PropertyIntelligenceCachePolicyMeta;
  categories: {
    property_details: PropertyCategoryResult<PropertyDetails>;
    property_valuation: PropertyCategoryResult<PropertyValuation>;
    nearby_houses: PropertyCategoryResult<NearbyListing[]>;
    nearby_land: PropertyCategoryResult<NearbyListing[]>;
    market_statistics: PropertyCategoryResult<MarketStatistics>;
  };
};
