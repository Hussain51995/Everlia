import { createAdminClient } from "@/lib/supabase/admin";
import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import { SupabasePropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import {
  createMemoryCacheProvider,
  createPropertyIntelligenceCacheProvider,
  resolveRedisCacheEnvironment,
} from "@/lib/property-intelligence/cache/provider";
import {
  MemoryPropertyCacheIndexStore,
  RedisPropertyCacheIndexStore,
} from "@/lib/property-intelligence/cache/provider/index-store";
import { getPropertyIntelligenceRedisClient } from "@/lib/property-intelligence/cache/provider/client";
import {
  resolveApiAccountScope,
  resolveProviderMonthlyBudget,
} from "@/lib/property-intelligence/execution/budget-config";
import {
  MemoryPropertyBudgetRepository,
  SupabasePropertyBudgetRepository,
} from "@/lib/property-intelligence/execution/budget-repository";
import { createBudgetService } from "@/lib/property-intelligence/execution/budget-service";
import {
  MemoryPropertyFetchDedupeRepository,
  SupabasePropertyFetchDedupeRepository,
} from "@/lib/property-intelligence/execution/dedupe";
import { createProviderExecutionGateway } from "@/lib/property-intelligence/execution/provider-gateway";
import {
  createUsageTracker,
  MemoryPropertyUsageRepository,
  SupabasePropertyUsageRepository,
} from "@/lib/property-intelligence/execution/usage-tracker";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { createRentCastProvider } from "@/lib/property-intelligence/providers/rentcast/adapter";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import {
  MemoryPropertyIntelligenceSettingsRepository,
  SupabasePropertyIntelligenceSettingsRepository,
} from "@/lib/property-intelligence/settings/repository";
import { createPropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import type { PropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import type { PropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import type { PropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";

export type CreateInsightsServiceOptions = {
  allowLiveProviders?: boolean;
  memory?: boolean;
  featureEnabled?: boolean;
  monthlyBudget?: number;
};

function createInsightsProviderRegistry(options?: {
  memory?: boolean;
  allowLiveProviders?: boolean;
}): PropertyProviderRegistry {
  const useLive =
    !options?.memory || Boolean(options.allowLiveProviders);

  const registry = new PropertyProviderRegistry({
    defaultProviderId: useLive ? "rentcast" : "mock",
    categoryProviders: useLive
      ? {
          property_details: "rentcast",
          property_valuation: "rentcast",
          nearby_houses: "rentcast",
          nearby_land: "rentcast",
          market_statistics: "rentcast",
        }
      : {
          property_details: "mock",
          property_valuation: "mock",
          nearby_houses: "mock",
          nearby_land: "mock",
          market_statistics: "mock",
        },
  });

  registry.register(createMockProvider({ scenario: "success" }));

  if (useLive) {
    registry.register(createRentCastProvider());
  }

  return registry;
}

export function createPropertyInsightsService(
  options?: CreateInsightsServiceOptions
): PropertyIntelligenceService {
  const registry = createInsightsProviderRegistry({
    memory: options?.memory,
    allowLiveProviders: options?.allowLiveProviders,
  });

  if (options?.memory) {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    if (options.featureEnabled) settings.setFeatureEnabled(true);
    if (!options.allowLiveProviders) {
      for (const category of [
        "property_details",
        "property_valuation",
        "nearby_houses",
        "nearby_land",
        "market_statistics",
      ] as const) {
        settings.setCategoryProvider(category, "mock");
      }
      void settings.updateGlobal({ defaultProviderId: "mock" });
    }
    const cache = createPropertyCacheService({
      provider: createMemoryCacheProvider(),
      identityRepo: new MemoryPropertyIdentityRepository(),
      indexStore: new MemoryPropertyCacheIndexStore(),
      environment: "test",
      getInvalidationGeneration: async () =>
        (await settings.getResolvedConfig()).global.configVersion,
    });
    const budgetRepo = new MemoryPropertyBudgetRepository();
    const budget = createBudgetService(budgetRepo, {
      monthlyBudget:
        options.monthlyBudget ??
        resolveProviderMonthlyBudget({ settingsBudget: 50 }),
      apiAccountScope: "default",
    });
    const usage = createUsageTracker(new MemoryPropertyUsageRepository());
    const gateway = createProviderExecutionGateway({
      budget,
      dedupe: new MemoryPropertyFetchDedupeRepository(),
      usage,
      enforceBudgetForMock: true,
    });
    return createPropertyIntelligenceService({
      settings,
      cache,
      registry,
      budget: gateway,
      usage,
    });
  }

  const admin = createAdminClient();
  const settings = new SupabasePropertyIntelligenceSettingsRepository(admin);
  const redisProvider = createPropertyIntelligenceCacheProvider({
    backend: "redis",
  });
  const cache = createPropertyCacheService({
    provider: redisProvider,
    identityRepo: new SupabasePropertyIdentityRepository(admin),
    indexStore: new RedisPropertyCacheIndexStore(
      getPropertyIntelligenceRedisClient()
    ),
    environment: resolveRedisCacheEnvironment(),
    getInvalidationGeneration: async () =>
      (await settings.getResolvedConfig()).global.configVersion,
    onOperationalError: (event) => {
      console.warn("[property-intelligence/redis]", {
        code: event.code,
        operation: event.operation,
      });
    },
  });
  const budget = createBudgetService(new SupabasePropertyBudgetRepository(admin), {
    monthlyBudget: options?.monthlyBudget ?? resolveProviderMonthlyBudget(),
    apiAccountScope: resolveApiAccountScope(),
  });
  const usage = createUsageTracker(new SupabasePropertyUsageRepository(admin));
  const gateway = createProviderExecutionGateway({
    budget,
    dedupe: new SupabasePropertyFetchDedupeRepository(admin),
    usage,
    apiAccountScope: resolveApiAccountScope(),
    enforceBudgetForMock: true,
  });

  return createPropertyIntelligenceService({
    settings,
    cache,
    registry,
    budget: gateway,
    usage,
  });
}

export function createPropertyIntelligenceCacheStack(options?: {
  memory?: boolean;
}): {
  settings: PropertyIntelligenceSettingsRepository;
  cache: PropertyCacheService;
} {
  if (options?.memory) {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    const cache = createPropertyCacheService({
      provider: createMemoryCacheProvider(),
      identityRepo: new MemoryPropertyIdentityRepository(),
      indexStore: new MemoryPropertyCacheIndexStore(),
      environment: "test",
      getInvalidationGeneration: async () =>
        (await settings.getResolvedConfig()).global.configVersion,
    });
    return { settings, cache };
  }

  const admin = createAdminClient();
  const settings = new SupabasePropertyIntelligenceSettingsRepository(admin);
  const cache = createPropertyCacheService({
    provider: createPropertyIntelligenceCacheProvider({ backend: "redis" }),
    identityRepo: new SupabasePropertyIdentityRepository(admin),
    indexStore: new RedisPropertyCacheIndexStore(
      getPropertyIntelligenceRedisClient()
    ),
    environment: resolveRedisCacheEnvironment(),
    getInvalidationGeneration: async () =>
      (await settings.getResolvedConfig()).global.configVersion,
  });
  return { settings, cache };
}
