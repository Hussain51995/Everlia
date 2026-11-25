import type { SupabaseClient } from "@supabase/supabase-js";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import {
  DEFAULT_GLOBAL_SETTINGS,
  type PropertyIntelligenceCategorySettings,
  type PropertyIntelligenceGlobalSettings,
  type PropertyIntelligenceResolvedConfig,
} from "@/lib/property-intelligence/settings/types";

export type GlobalSettingsPatch = {
  featureEnabled?: boolean;
  browserCachingEnabled?: boolean;
  defaultProviderId?: PropertyIntelligenceGlobalSettings["defaultProviderId"];
  monthlyApiBudget?: number;
};

export type CategorySettingsPatch = {
  enabled?: boolean;
  providerId?: PropertyIntelligenceCategorySettings["providerId"];
  browserTtlSeconds?: number;
  databaseTtlSeconds?: number;
  searchRadiusMiles?: number | null;
  listingLimit?: number | null;
  queryFilters?: Record<string, unknown>;
};

export interface PropertyIntelligenceSettingsRepository {
  getResolvedConfig(): Promise<PropertyIntelligenceResolvedConfig>;
}

const DEFAULT_CATEGORY_SEED: Record<
  PropertyDataCategory,
  Omit<PropertyIntelligenceCategorySettings, "category">
> = {
  property_details: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: 604800,
    databaseTtlSeconds: 15552000,
    configVersion: 1,
    searchRadiusMiles: null,
    listingLimit: null,
    queryFilters: {},
  },
  property_valuation: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: 86400,
    databaseTtlSeconds: 2592000,
    configVersion: 1,
    searchRadiusMiles: null,
    listingLimit: null,
    queryFilters: {},
  },
  nearby_houses: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: 21600,
    databaseTtlSeconds: 604800,
    configVersion: 1,
    searchRadiusMiles: 1,
    listingLimit: 10,
    queryFilters: {},
  },
  nearby_land: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: 21600,
    databaseTtlSeconds: 604800,
    configVersion: 1,
    searchRadiusMiles: 5,
    listingLimit: 10,
    queryFilters: {},
  },
  market_statistics: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: 86400,
    databaseTtlSeconds: 2592000,
    configVersion: 1,
    searchRadiusMiles: null,
    listingLimit: null,
    queryFilters: {},
  },
};

function defaultCategories(): Record<
  PropertyDataCategory,
  PropertyIntelligenceCategorySettings
> {
  const out = {} as Record<
    PropertyDataCategory,
    PropertyIntelligenceCategorySettings
  >;
  for (const category of PROPERTY_DATA_CATEGORIES) {
    out[category] = { category, ...DEFAULT_CATEGORY_SEED[category] };
  }
  return out;
}

export class MemoryPropertyIntelligenceSettingsRepository
  implements PropertyIntelligenceSettingsRepository
{
  global: PropertyIntelligenceGlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
  };
  categories = defaultCategories();

  async getResolvedConfig(): Promise<PropertyIntelligenceResolvedConfig> {
    return {
      global: { ...this.global },
      categories: { ...this.categories },
    };
  }

  setFeatureEnabled(enabled: boolean) {
    this.global = {
      ...this.global,
      featureEnabled: enabled,
      configVersion: this.global.configVersion + 1,
    };
  }

  setCategoryEnabled(category: PropertyDataCategory, enabled: boolean) {
    const current = this.categories[category];
    this.categories[category] = {
      ...current,
      enabled,
      configVersion: current.configVersion + 1,
    };
    this.bumpGlobalConfigVersion();
  }

  setCategoryProvider(
    category: PropertyDataCategory,
    providerId: PropertyIntelligenceCategorySettings["providerId"]
  ) {
    const current = this.categories[category];
    this.categories[category] = {
      ...current,
      providerId,
      configVersion: current.configVersion + 1,
    };
    this.bumpGlobalConfigVersion();
  }

  setCategoryTtl(
    category: PropertyDataCategory,
    input: { browserTtlSeconds: number; databaseTtlSeconds: number }
  ) {
    if (input.browserTtlSeconds > input.databaseTtlSeconds) {
      throw new Error("browser TTL must not exceed database TTL");
    }
    if (input.browserTtlSeconds < 1 || input.databaseTtlSeconds < 1) {
      throw new Error("TTL values must be >= 1 second");
    }
    const current = this.categories[category];
    this.categories[category] = {
      ...current,
      browserTtlSeconds: input.browserTtlSeconds,
      databaseTtlSeconds: input.databaseTtlSeconds,
      configVersion: current.configVersion + 1,
    };
    this.bumpGlobalConfigVersion();
  }

  bumpGlobalConfigVersion() {
    this.global = {
      ...this.global,
      configVersion: this.global.configVersion + 1,
    };
  }

  async updateGlobal(
    patch: GlobalSettingsPatch,
    _updatedBy?: string | null
  ): Promise<PropertyIntelligenceGlobalSettings> {
    void _updatedBy;
    if (patch.featureEnabled != null) {
      this.global.featureEnabled = patch.featureEnabled;
    }
    if (patch.browserCachingEnabled != null) {
      this.global.browserCachingEnabled = patch.browserCachingEnabled;
    }
    if (patch.defaultProviderId != null) {
      this.global.defaultProviderId = patch.defaultProviderId;
    }
    if (patch.monthlyApiBudget != null) {
      if (patch.monthlyApiBudget < 0) {
        throw new Error("monthlyApiBudget must be >= 0");
      }
      this.global.monthlyApiBudget = Math.floor(patch.monthlyApiBudget);
    }
    this.bumpGlobalConfigVersion();
    this.global = {
      ...this.global,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.global };
  }

  async updateCategory(
    category: PropertyDataCategory,
    patch: CategorySettingsPatch
  ): Promise<PropertyIntelligenceCategorySettings> {
    const current = this.categories[category];
    const next = { ...current };

    if (patch.enabled != null) next.enabled = patch.enabled;
    if (patch.providerId != null) next.providerId = patch.providerId;
    if (patch.browserTtlSeconds != null) {
      next.browserTtlSeconds = Math.floor(patch.browserTtlSeconds);
    }
    if (patch.databaseTtlSeconds != null) {
      next.databaseTtlSeconds = Math.floor(patch.databaseTtlSeconds);
    }
    if (patch.searchRadiusMiles !== undefined) {
      next.searchRadiusMiles = patch.searchRadiusMiles;
    }
    if (patch.listingLimit !== undefined) {
      next.listingLimit = patch.listingLimit;
    }
    if (patch.queryFilters != null) {
      next.queryFilters = patch.queryFilters;
    }

    if (next.browserTtlSeconds > next.databaseTtlSeconds) {
      throw new Error("browser TTL must not exceed database TTL");
    }
    if (next.browserTtlSeconds < 1 || next.databaseTtlSeconds < 1) {
      throw new Error("TTL values must be >= 1 second");
    }

    next.configVersion = current.configVersion + 1;
    this.categories[category] = next;
    this.bumpGlobalConfigVersion();
    return { ...next };
  }
}

export class SupabasePropertyIntelligenceSettingsRepository
  implements PropertyIntelligenceSettingsRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async getResolvedConfig(): Promise<PropertyIntelligenceResolvedConfig> {
    const categories = defaultCategories();

    const { data: globalRow, error: globalError } = await this.client
      .from("property_intelligence_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (globalError) throw new Error(globalError.message);

    const global: PropertyIntelligenceGlobalSettings = globalRow
      ? {
          featureEnabled: Boolean(globalRow.feature_enabled),
          browserCachingEnabled: Boolean(globalRow.browser_caching_enabled),
          defaultProviderId: String(globalRow.default_provider_id),
          configVersion: Number(globalRow.config_version ?? 1),
          monthlyApiBudget: Number(globalRow.monthly_api_budget ?? 500),
          updatedAt: (globalRow.updated_at as string) ?? null,
          updatedBy: (globalRow.updated_by as string) ?? null,
        }
      : { ...DEFAULT_GLOBAL_SETTINGS };

    const { data: categoryRows, error: categoryError } = await this.client
      .from("property_intelligence_category_settings")
      .select("*");
    if (categoryError) throw new Error(categoryError.message);

    for (const row of categoryRows ?? []) {
      const category = row.category as PropertyDataCategory;
      if (!PROPERTY_DATA_CATEGORIES.includes(category)) continue;
      categories[category] = {
        category,
        enabled: Boolean(row.enabled),
        providerId: String(row.provider_id),
        browserTtlSeconds: Number(row.browser_ttl_seconds),
        databaseTtlSeconds: Number(row.database_ttl_seconds),
        configVersion: Number(row.config_version ?? 1),
        searchRadiusMiles:
          row.search_radius_miles === null || row.search_radius_miles === undefined
            ? null
            : Number(row.search_radius_miles),
        listingLimit:
          row.listing_limit === null || row.listing_limit === undefined
            ? null
            : Number(row.listing_limit),
        queryFilters:
          (row.query_filters as Record<string, unknown>) ?? {},
      };
    }

    for (const category of PROPERTY_DATA_CATEGORIES) {
      if (!categories[category].providerId) {
        categories[category].providerId = global.defaultProviderId;
      }
    }

    return { global, categories };
  }

  async updateGlobal(
    patch: GlobalSettingsPatch,
    updatedBy?: string | null
  ): Promise<PropertyIntelligenceGlobalSettings> {
    const current = await this.getResolvedConfig();
    const next = {
      feature_enabled:
        patch.featureEnabled ?? current.global.featureEnabled,
      browser_caching_enabled:
        patch.browserCachingEnabled ?? current.global.browserCachingEnabled,
      default_provider_id:
        patch.defaultProviderId ?? current.global.defaultProviderId,
      monthly_api_budget:
        patch.monthlyApiBudget ?? current.global.monthlyApiBudget,
      config_version: current.global.configVersion + 1,
      updated_by: updatedBy ?? null,
      singleton: true,
    };

    if (next.monthly_api_budget < 0) {
      throw new Error("monthlyApiBudget must be >= 0");
    }

    const { data, error } = await this.client
      .from("property_intelligence_settings")
      .upsert(next, { onConflict: "singleton" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return {
      featureEnabled: Boolean(data.feature_enabled),
      browserCachingEnabled: Boolean(data.browser_caching_enabled),
      defaultProviderId: String(data.default_provider_id),
      configVersion: Number(data.config_version ?? 1),
      monthlyApiBudget: Number(data.monthly_api_budget ?? 0),
      updatedAt: (data.updated_at as string) ?? null,
      updatedBy: (data.updated_by as string) ?? null,
    };
  }

  async updateCategory(
    category: PropertyDataCategory,
    patch: CategorySettingsPatch
  ): Promise<PropertyIntelligenceCategorySettings> {
    const before = await this.getResolvedConfig();
    const current = before.categories[category];
    const browserTtl =
      patch.browserTtlSeconds ?? current.browserTtlSeconds;
    const databaseTtl =
      patch.databaseTtlSeconds ?? current.databaseTtlSeconds;

    if (browserTtl > databaseTtl) {
      throw new Error("browser TTL must not exceed database TTL");
    }
    if (browserTtl < 1 || databaseTtl < 1) {
      throw new Error("TTL values must be >= 1 second");
    }

    const row = {
      category,
      enabled: patch.enabled ?? current.enabled,
      provider_id: patch.providerId ?? current.providerId,
      browser_ttl_seconds: Math.floor(browserTtl),
      database_ttl_seconds: Math.floor(databaseTtl),
      config_version: current.configVersion + 1,
      search_radius_miles:
        patch.searchRadiusMiles !== undefined
          ? patch.searchRadiusMiles
          : current.searchRadiusMiles,
      listing_limit:
        patch.listingLimit !== undefined
          ? patch.listingLimit
          : current.listingLimit,
      query_filters: patch.queryFilters ?? current.queryFilters,
    };

    const { data, error } = await this.client
      .from("property_intelligence_category_settings")
      .upsert(row, { onConflict: "category" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await this.client
      .from("property_intelligence_settings")
      .update({
        config_version: before.global.configVersion + 1,
      })
      .eq("singleton", true);

    return {
      category,
      enabled: Boolean(data.enabled),
      providerId: String(data.provider_id),
      browserTtlSeconds: Number(data.browser_ttl_seconds),
      databaseTtlSeconds: Number(data.database_ttl_seconds),
      configVersion: Number(data.config_version ?? 1),
      searchRadiusMiles:
        data.search_radius_miles == null
          ? null
          : Number(data.search_radius_miles),
      listingLimit:
        data.listing_limit == null ? null : Number(data.listing_limit),
      queryFilters: (data.query_filters as Record<string, unknown>) ?? {},
    };
  }
}
