import type { PropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { buildCategoryCachePolicy } from "@/lib/property-intelligence/cache/policy";
import type { BuiltCacheKey } from "@/lib/property-intelligence/cache/types";
import type { CacheLookupRequest } from "@/lib/property-intelligence/cache/types";
import type { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import type { PropertyIntelligenceResolvedConfig } from "@/lib/property-intelligence/settings/types";
import type {
  PlannedProviderOperation,
  ProviderOperationKind,
  RequestPlan,
  CategoryPlanState,
} from "@/lib/property-intelligence/planner/types";
import {
  PROPERTY_DATA_CATEGORIES,
  type PropertyDataCategory,
  type PropertyIdentity,
  type PropertyProviderId,
} from "@/lib/types/property-intelligence";

export type PlanRequestInput = {
  identity: PropertyIdentity;
  zipCode: string | null;
  requestedCategories?: PropertyDataCategory[] | null;
  config: PropertyIntelligenceResolvedConfig;
  registry: PropertyProviderRegistry;
  cache: PropertyCacheService;
};

const OPERATION_BY_CATEGORY: Record<
  PropertyDataCategory,
  ProviderOperationKind
> = {
  property_details: "getPropertyDetails",
  property_valuation: "getPropertyValuation",
  nearby_houses: "getNearbyResidentialListings",
  nearby_land: "getNearbyLandListings",
  market_statistics: "getMarketStatistics",
};

export class PropertyIntelligenceRequestPlanner {
  async plan(input: PlanRequestInput): Promise<RequestPlan> {
    const requested = normalizeRequested(input.requestedCategories);
    const categoryStates: CategoryPlanState[] = [];
    const lookupRequests: Array<
      CacheLookupRequest & { category: PropertyDataCategory }
    > = [];

    for (const category of PROPERTY_DATA_CATEGORIES) {
      if (!requested.includes(category)) {
        categoryStates.push({ category, disposition: "not_requested" });
        continue;
      }

      const settings = input.config.categories[category];
      if (!settings?.enabled) {
        categoryStates.push({ category, disposition: "disabled" });
        continue;
      }

      const effectiveProviderId =
        settings.providerId || input.config.global.defaultProviderId;
      const provider = input.registry.getProvider(effectiveProviderId);
      const providerCapability = provider?.getCapability(category);
      if (!provider || !providerCapability?.supported) {
        categoryStates.push({
          category,
          disposition: "unsupported",
          providerId: effectiveProviderId,
          message: `Provider "${effectiveProviderId}" does not support ${category}`,
        });
        continue;
      }

      const cacheKey = buildKeyForCategory(
        input.cache,
        category,
        effectiveProviderId,
        input.identity,
        input.zipCode,
        settings
      );

      lookupRequests.push({
        category,
        providerId: effectiveProviderId,
        key: cacheKey,
        policy: buildCategoryCachePolicy({
          databaseTtlSeconds: settings.databaseTtlSeconds,
          maxDatabaseTtlSeconds:
            providerCapability.retention?.maxDatabaseTtlSeconds ?? null,
          categoryConfigVersion: settings.configVersion,
          permitStaleDisplay: false,
        }),
      });

      categoryStates.push({
        category,
        disposition: "fetch",
        reason: "missing",
        providerId: effectiveProviderId,
        settings,
        cacheKey,
        capability: providerCapability,
      });
    }

    const batch = await input.cache.getMany(
      lookupRequests.map((r) => ({
        providerId: r.providerId,
        category: r.category,
        key: r.key,
      }))
    );

    const enabledRequested: PropertyDataCategory[] = [];
    const cacheHits: PropertyDataCategory[] = [];
    const toFetch: PropertyDataCategory[] = [];

    for (let i = 0; i < categoryStates.length; i++) {
      const state = categoryStates[i]!;
      if (state.disposition !== "fetch") continue;

      enabledRequested.push(state.category);
      const hit = batch.get(state.cacheKey.cacheKey);
      if (hit?.status === "hit") {
        categoryStates[i] = {
          category: state.category,
          disposition: "serve_cache",
          cache: hit,
          providerId: state.providerId,
          settings: state.settings,
          cacheKey: state.cacheKey,
        };
        cacheHits.push(state.category);
      } else {
        const reason =
          hit?.status === "miss" && hit.reason === "expired"
            ? "expired"
            : "missing";
        categoryStates[i] = {
          ...state,
          disposition: "fetch",
          reason,
        };
        toFetch.push(state.category);
      }
    }

    const operations = planOperations(categoryStates);

    return {
      requestedCategories: requested,
      enabledRequested,
      categoryStates,
      operations,
      cacheHits,
      toFetch,
    };
  }
}

function normalizeRequested(
  requested?: PropertyDataCategory[] | null
): PropertyDataCategory[] {
  if (!requested || requested.length === 0) {
    return [...PROPERTY_DATA_CATEGORIES];
  }
  const set = new Set<PropertyDataCategory>();
  for (const c of requested) {
    if (PROPERTY_DATA_CATEGORIES.includes(c)) set.add(c);
  }
  return PROPERTY_DATA_CATEGORIES.filter((c) => set.has(c));
}

function buildKeyForCategory(
  cache: PropertyCacheService,
  category: PropertyDataCategory,
  providerId: PropertyProviderId,
  identity: PropertyIdentity,
  zipCode: string | null,
  settings: PlanRequestInput["config"]["categories"][PropertyDataCategory]
): BuiltCacheKey {
  switch (category) {
    case "property_details":
      return cache.detailsKey(providerId, identity.normalizedKey);
    case "property_valuation":
      return cache.valuationKey(providerId, identity.normalizedKey);
    case "nearby_houses":
      return cache.nearbyKey(providerId, "nearby_houses", identity.normalizedKey, {
        kind: "residential",
        radiusMiles: settings.searchRadiusMiles ?? 1,
        limit: settings.listingLimit ?? 10,
        status: "active",
        filters: settings.queryFilters,
      });
    case "nearby_land":
      return cache.nearbyKey(providerId, "nearby_land", identity.normalizedKey, {
        kind: "land",
        radiusMiles: settings.searchRadiusMiles ?? 5,
        limit: settings.listingLimit ?? 10,
        status: "active",
        filters: settings.queryFilters,
      });
    case "market_statistics":
      return cache.marketKey(providerId, {
        countryCode: identity.components.countryCode || "US",
        zipCode:
          zipCode ||
          identity.components.postalCode ||
          "00000",
        dataType: "All",
      });
  }
}

function planOperations(
  categoryStates: CategoryPlanState[]
): PlannedProviderOperation[] {
  const fetchStates = categoryStates.filter(
    (s): s is Extract<CategoryPlanState, { disposition: "fetch" }> =>
      s.disposition === "fetch"
  );

  const byCategory = new Map(
    fetchStates.map((s) => [s.category, s] as const)
  );

  const operations: PlannedProviderOperation[] = [];
  const deferredDetails =
    shouldDeferDetailsBehindValuation(byCategory);

  for (const state of fetchStates) {
    if (deferredDetails && state.category === "property_details") {
      operations.push({
        category: state.category,
        providerId: state.providerId,
        operation: OPERATION_BY_CATEGORY[state.category],
        reason: state.reason,
        cacheKey: state.cacheKey,
        costUnits: state.capability.requestCostUnits ?? 1,
        capability: state.capability,
        maySatisfyCategories: [],
        conditional: true,
        dependsOnCategory: "property_valuation",
      });
      continue;
    }

    const maySatisfy = (state.capability.mayAlsoProvide ?? []).filter(
      (other) => {
        if (other === state.category) return false;
        const otherState = byCategory.get(other);
        if (!otherState) return false;
        if (otherState.providerId !== state.providerId) return false;
        return true;
      }
    );

    operations.push({
      category: state.category,
      providerId: state.providerId,
      operation: OPERATION_BY_CATEGORY[state.category],
      reason: state.reason,
      cacheKey: state.cacheKey,
      costUnits: state.capability.requestCostUnits ?? 1,
      capability: state.capability,
      maySatisfyCategories: maySatisfy,
      conditional: false,
    });
  }

  operations.sort((a, b) => {
    if (a.conditional !== b.conditional) return a.conditional ? 1 : -1;
    if (a.category === "property_valuation") return -1;
    if (b.category === "property_valuation") return 1;
    return 0;
  });

  return operations;
}

function shouldDeferDetailsBehindValuation(
  byCategory: Map<
    PropertyDataCategory,
    Extract<CategoryPlanState, { disposition: "fetch" }>
  >
): boolean {
  const details = byCategory.get("property_details");
  const valuation = byCategory.get("property_valuation");
  if (!details || !valuation) return false;
  if (details.providerId !== valuation.providerId) return false;
  return (valuation.capability.mayAlsoProvide ?? []).includes(
    "property_details"
  );
}

export function createRequestPlanner(): PropertyIntelligenceRequestPlanner {
  return new PropertyIntelligenceRequestPlanner();
}
