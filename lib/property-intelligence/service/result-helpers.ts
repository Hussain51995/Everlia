import type { CacheLookupResult } from "@/lib/property-intelligence/cache/types";
import type {
  CategoryResultStatus,
  PropertyCategoryResult,
  PropertyDataCategory,
  PropertyDataSource,
  ProviderError,
} from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

export function emptyCategoryResult<T>(
  category: PropertyDataCategory,
  status: CategoryResultStatus,
  error: ProviderError | null = null
): PropertyCategoryResult<T> {
  return {
    category,
    status,
    data: null,
    source: null,
    error,
    cache: null,
  };
}

export function availableFromCache<T>(
  category: PropertyDataCategory,
  data: T,
  source: PropertyDataSource | null,
  cache: Extract<CacheLookupResult, { status: "hit" }>
): PropertyCategoryResult<T> {
  return {
    category,
    status: "available",
    data,
    source,
    error: null,
    cache: {
      hit: true,
      fetchedAt: cache.record.fetchedAt,
      expiresAt: cache.effectiveExpiresAt,
      remainingTtlSeconds: cache.remainingTtlSeconds,
      isNegative: cache.isNegative,
      configVersion: cache.categoryConfigVersion ?? null,
    },
  };
}

export function availableFromProvider<T>(
  category: PropertyDataCategory,
  data: T,
  source: PropertyDataSource,
  cacheMeta?: {
    expiresAt?: string | null;
    remainingTtlSeconds?: number | null;
    configVersion?: number | null;
  }
): PropertyCategoryResult<T> {
  return {
    category,
    status: "available",
    data,
    source,
    error: null,
    cache: {
      hit: false,
      fetchedAt: source.retrievedAt,
      expiresAt: cacheMeta?.expiresAt ?? null,
      remainingTtlSeconds: cacheMeta?.remainingTtlSeconds ?? null,
      isNegative: false,
      configVersion: cacheMeta?.configVersion ?? null,
    },
  };
}

export function mapProviderErrorToStatus(
  error: ProviderError
): CategoryResultStatus {
  if (error.code === "unsupported_capability") return "unsupported";
  if (error.code === "rate_limited") return "rate_limited";
  if (error.code === "budget_denied") return "budget_exhausted";
  if (error.code === "not_found") return "unavailable";
  return "error";
}

export function emptyIntelligenceCategories() {
  const categories = {} as Record<
    PropertyDataCategory,
    PropertyCategoryResult<unknown>
  >;
  for (const category of PROPERTY_DATA_CATEGORIES) {
    categories[category] = emptyCategoryResult(category, "disabled");
  }
  return categories as {
    property_details: PropertyCategoryResult<never>;
    property_valuation: PropertyCategoryResult<never>;
    nearby_houses: PropertyCategoryResult<never>;
    nearby_land: PropertyCategoryResult<never>;
    market_statistics: PropertyCategoryResult<never>;
  };
}
