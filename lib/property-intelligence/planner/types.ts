import type { BuiltCacheKey } from "@/lib/property-intelligence/cache/types";
import type { CacheLookupResult } from "@/lib/property-intelligence/cache/types";
import type { PropertyIntelligenceCategorySettings } from "@/lib/property-intelligence/settings/types";
import type {
  PropertyDataCategory,
  PropertyProviderId,
  ProviderCapability,
} from "@/lib/types/property-intelligence";

export type ProviderOperationKind =
  | "getPropertyDetails"
  | "getPropertyValuation"
  | "getNearbyResidentialListings"
  | "getNearbyLandListings"
  | "getMarketStatistics";

export type PlannedFetchReason = "missing" | "expired";

export type PlannedProviderOperation = {
  category: PropertyDataCategory;
  providerId: PropertyProviderId;
  operation: ProviderOperationKind;
  reason: PlannedFetchReason;
  cacheKey: BuiltCacheKey;
  costUnits: number;
  capability: ProviderCapability;
  maySatisfyCategories: PropertyDataCategory[];
  conditional: boolean;
  dependsOnCategory?: PropertyDataCategory;
};

export type CategoryPlanState =
  | {
      category: PropertyDataCategory;
      disposition: "serve_cache";
      cache: CacheLookupResult & { status: "hit" };
      providerId: PropertyProviderId;
      settings: PropertyIntelligenceCategorySettings;
      cacheKey: BuiltCacheKey;
    }
  | {
      category: PropertyDataCategory;
      disposition: "fetch";
      reason: PlannedFetchReason;
      providerId: PropertyProviderId;
      settings: PropertyIntelligenceCategorySettings;
      cacheKey: BuiltCacheKey;
      capability: ProviderCapability;
    }
  | {
      category: PropertyDataCategory;
      disposition: "disabled";
    }
  | {
      category: PropertyDataCategory;
      disposition: "unsupported";
      providerId: PropertyProviderId;
      message: string;
    }
  | {
      category: PropertyDataCategory;
      disposition: "not_requested";
    };

export type RequestPlan = {
  requestedCategories: PropertyDataCategory[];
  enabledRequested: PropertyDataCategory[];
  categoryStates: CategoryPlanState[];
  operations: PlannedProviderOperation[];
  cacheHits: PropertyDataCategory[];
  toFetch: PropertyDataCategory[];
};
