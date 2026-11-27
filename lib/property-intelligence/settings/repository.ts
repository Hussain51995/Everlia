import type { SupabaseClient } from "@supabase/supabase-js";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import {
  assertAllowedBrowserTtlSeconds,
  assertAllowedRedisTtlSeconds,
  coerceBrowserTtlSeconds,
  coerceRedisTtlSeconds,
  DEFAULT_BROWSER_TTL_SECONDS,
  DEFAULT_REDIS_TTL_SECONDS,
  getRecommendedTtlDefaults,
} from "@/lib/property-intelligence/settings/ttl-policy";
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
  redisTtlSeconds?: number;
  searchRadiusMiles?: number | null;
  listingLimit?: number | null;
  queryFilters?: Record<string, unknown>;
};

export interface PropertyIntelligenceSettingsRepository {
  getResolvedConfig(): Promise<PropertyIntelligenceResolvedConfig>;
  bumpConfigVersion?(): Promise<number>;
  restoreRecommendedDefaults?(): Promise<PropertyIntelligenceResolvedConfig>;
}

const DEFAULT_CATEGORY_SEED: Record<
  PropertyDataCategory,
  Omit<PropertyIntelligenceCategorySettings, "category">
> = {
  property_details: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: DEFAULT_BROWSER_TTL_SECONDS.property_details,
    redisTtlSeconds: DEFAULT_REDIS_TTL_SECONDS.property_details,
    configVersion: 1,
    searchRadiusMiles: null,
    listingLimit: null,
    queryFilters: {},
  },
  property_valuation: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: DEFAULT_BROWSER_TTL_SECONDS.property_valuation,
    redisTtlSeconds: DEFAULT_REDIS_TTL_SECONDS.property_valuation,
    configVersion: 1,
    searchRadiusMiles: null,
    listingLimit: null,
    queryFilters: {},
  },
  nearby_houses: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: DEFAULT_BROWSER_TTL_SECONDS.nearby_houses,
    redisTtlSeconds: DEFAULT_REDIS_TTL_SECONDS.nearby_houses,
    configVersion: 1,
    searchRadiusMiles: 1,
    listingLimit: 10,
    queryFilters: {},
  },
  nearby_land: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: DEFAULT_BROWSER_TTL_SECONDS.nearby_land,
    redisTtlSeconds: DEFAULT_REDIS_TTL_SECONDS.nearby_land,
    configVersion: 1,
    searchRadiusMiles: 5,
    listingLimit: 10,
    queryFilters: {},
  },
  market_statistics: {
    enabled: true,
    providerId: "rentcast",
    browserTtlSeconds: DEFAULT_BROWSER_TTL_SECONDS.market_statistics,
    redisTtlSeconds: DEFAULT_REDIS_TTL_SECONDS.market_statistics,
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
    input: { browserTtlSeconds: number; redisTtlSeconds: number }
  ) {
    const browserTtl = assertAllowedBrowserTtlSeconds(input.browserTtlSeconds);
    const redisTtl = assertAllowedRedisTtlSeconds(input.redisTtlSeconds);
    if (browserTtl > redisTtl) {
      throw new Error("browser TTL must not exceed Redis TTL");
    }
    const current = this.categories[category];
    this.categories[category] = {
      ...current,
      browserTtlSeconds: browserTtl,
      redisTtlSeconds: redisTtl,
      configVersion: current.configVersion + 1,
    };
    this.bumpGlobalConfigVersion();
  }

  async restoreRecommendedDefaults(): Promise<PropertyIntelligenceResolvedConfig> {
    for (const category of PROPERTY_DATA_CATEGORIES) {
      const defaults = getRecommendedTtlDefaults(category);
      const current = this.categories[category];
      this.categories[category] = {
        ...current,
        browserTtlSeconds: defaults.browserTtlSeconds,
        redisTtlSeconds: defaults.redisTtlSeconds,
        configVersion: current.configVersion + 1,
      };
    }
    this.bumpGlobalConfigVersion();
    return this.getResolvedConfig();
  }

  bumpGlobalConfigVersion() {
    this.global = {
      ...this.global,
      configVersion: this.global.configVersion + 1,
    };
  }

  async bumpConfigVersion(): Promise<number> {
    this.bumpGlobalConfigVersion();
    return this.global.configVersion;
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
      next.browserTtlSeconds = assertAllowedBrowserTtlSeconds(
        patch.browserTtlSeconds
      );
    }
    if (patch.redisTtlSeconds != null) {
      next.redisTtlSeconds = assertAllowedRedisTtlSeconds(
        patch.redisTtlSeconds
      );
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

    assertAllowedBrowserTtlSeconds(next.browserTtlSeconds);
    assertAllowedRedisTtlSeconds(next.redisTtlSeconds);
    if (next.browserTtlSeconds > next.redisTtlSeconds) {
      throw new Error("browser TTL must not exceed Redis TTL");
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
        browserTtlSeconds: coerceBrowserTtlSeconds(
          Number(row.browser_ttl_seconds)
        ),
        redisTtlSeconds: coerceRedisTtlSeconds(
          Number(
            (row as { redis_ttl_seconds?: unknown; database_ttl_seconds?: unknown })
              .redis_ttl_seconds ??
              (row as { database_ttl_seconds?: unknown }).database_ttl_seconds
          )
        ),
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
    const browserTtl = assertAllowedBrowserTtlSeconds(
      patch.browserTtlSeconds ?? current.browserTtlSeconds
    );
    const redisTtl = assertAllowedRedisTtlSeconds(
      patch.redisTtlSeconds ?? current.redisTtlSeconds
    );

    if (browserTtl > redisTtl) {
      throw new Error("browser TTL must not exceed Redis TTL");
    }

    const row = {
      category,
      enabled: patch.enabled ?? current.enabled,
      provider_id: patch.providerId ?? current.providerId,
      browser_ttl_seconds: browserTtl,
      redis_ttl_seconds: redisTtl,
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
      browserTtlSeconds: coerceBrowserTtlSeconds(
        Number(data.browser_ttl_seconds)
      ),
      redisTtlSeconds: coerceRedisTtlSeconds(
        Number(
          (data as { redis_ttl_seconds?: unknown; database_ttl_seconds?: unknown })
            .redis_ttl_seconds ??
            (data as { database_ttl_seconds?: unknown }).database_ttl_seconds
        )
      ),
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

  async bumpConfigVersion(): Promise<number> {
    const current = await this.getResolvedConfig();
    const next = current.global.configVersion + 1;
    const { error } = await this.client
      .from("property_intelligence_settings")
      .update({ config_version: next })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return next;
  }

  async restoreRecommendedDefaults(): Promise<PropertyIntelligenceResolvedConfig> {
    const current = await this.getResolvedConfig();
    for (const category of PROPERTY_DATA_CATEGORIES) {
      const defaults = getRecommendedTtlDefaults(category);
      await this.updateCategory(category, {
        browserTtlSeconds: defaults.browserTtlSeconds,
        redisTtlSeconds: defaults.redisTtlSeconds,
      });
    }
    void current;
    return this.getResolvedConfig();
  }
}
