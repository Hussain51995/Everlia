import { createAdminClient } from "@/lib/supabase/admin";
import { MemoryPropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import { SupabasePropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { SupabasePropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
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
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import {
  MemoryPropertyIntelligenceSettingsRepository,
  SupabasePropertyIntelligenceSettingsRepository,
} from "@/lib/property-intelligence/settings/repository";
import { createPropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import type { PropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";

export type CreateInsightsServiceOptions = {
  allowLiveProviders?: boolean;
  memory?: boolean;
  featureEnabled?: boolean;
  monthlyBudget?: number;
};

export function createPropertyInsightsService(
  options?: CreateInsightsServiceOptions
): PropertyIntelligenceService {
  const registry = new PropertyProviderRegistry({
    defaultProviderId: "mock",
    categoryProviders: {
      property_details: "mock",
      property_valuation: "mock",
      nearby_houses: "mock",
      nearby_land: "mock",
      market_statistics: "mock",
    },
  });
  registry.register(createMockProvider({ scenario: "success" }));

  void options?.allowLiveProviders;

  if (options?.memory) {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    if (options.featureEnabled) settings.setFeatureEnabled(true);
    const cache = createPropertyCacheService(
      new MemoryPropertyCacheRepository(),
      new MemoryPropertyIdentityRepository()
    );
    const budgetRepo = new MemoryPropertyBudgetRepository();
    const budget = createBudgetService(budgetRepo, {
      monthlyBudget:
        options.monthlyBudget ?? resolveProviderMonthlyBudget({ settingsBudget: 50 }),
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
  const cache = createPropertyCacheService(
    new SupabasePropertyCacheRepository(admin),
    new SupabasePropertyIdentityRepository(admin)
  );
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
