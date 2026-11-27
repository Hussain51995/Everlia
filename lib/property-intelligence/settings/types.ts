import type {
  PropertyDataCategory,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";

export type PropertyIntelligenceGlobalSettings = {
  featureEnabled: boolean;
  browserCachingEnabled: boolean;
  defaultProviderId: PropertyProviderId;
  configVersion: number;
  monthlyApiBudget: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type PropertyIntelligenceCategorySettings = {
  category: PropertyDataCategory;
  enabled: boolean;
  providerId: PropertyProviderId;
  browserTtlSeconds: number;
  redisTtlSeconds: number;
  configVersion: number;
  searchRadiusMiles: number | null;
  listingLimit: number | null;
  queryFilters: Record<string, unknown>;
};

export type PropertyIntelligenceResolvedConfig = {
  global: PropertyIntelligenceGlobalSettings;
  categories: Record<
    PropertyDataCategory,
    PropertyIntelligenceCategorySettings
  >;
};

export const DEFAULT_GLOBAL_SETTINGS: PropertyIntelligenceGlobalSettings = {
  featureEnabled: false,
  browserCachingEnabled: true,
  defaultProviderId: "rentcast",
  configVersion: 1,
  monthlyApiBudget: 500,
  updatedAt: null,
  updatedBy: null,
};
