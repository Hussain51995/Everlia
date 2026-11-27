import { isNegativePayload, computeExpiresAt } from "@/lib/property-intelligence/cache/freshness";
import { resolveEffectiveTtlSeconds } from "@/lib/property-intelligence/cache/policy-math";
import type { PropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import type { PropertyBudgetGateway } from "@/lib/property-intelligence/execution/budget-gateway";
import {
  extractDetailsFromValuation,
  incidentalDetailsAreComplete,
  isIncidentalPersistAllowed,
} from "@/lib/property-intelligence/planner/required-fields";
import {
  createRequestPlanner,
  type PropertyIntelligenceRequestPlanner,
} from "@/lib/property-intelligence/planner/planner";
import type { PlannedProviderOperation } from "@/lib/property-intelligence/planner/types";
import type { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import type { PropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import {
  availableFromCache,
  availableFromProvider,
  emptyCategoryResult,
  emptyIntelligenceCategories,
  mapProviderErrorToStatus,
} from "@/lib/property-intelligence/service/result-helpers";
import {
  resolveCustomerPropertyAddress,
  type CustomerPropertyFields,
} from "@/lib/property-intelligence/customer-property";
import { buildDataSource } from "@/lib/property-intelligence/providers/types";
import type { PropertyUsageTracker } from "@/lib/property-intelligence/execution/usage-tracker";
import { buildCategoryCachePolicy } from "@/lib/property-intelligence/cache/policy";
import type {
  MarketStatistics,
  NearbyListing,
  NearbyListingsQuery,
  PropertyCategoryResult,
  PropertyDataCategory,
  PropertyDetails,
  PropertyIntelligenceCachePolicyMeta,
  PropertyIntelligenceResult,
  PropertyLookup,
  PropertyValuation,
  ProviderOutcome,
} from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

function buildCachePolicyMeta(
  config: Awaited<
    ReturnType<PropertyIntelligenceSettingsRepository["getResolvedConfig"]>
  >
): PropertyIntelligenceCachePolicyMeta {
  const categoryConfigVersions = {} as Record<PropertyDataCategory, number>;
  for (const category of PROPERTY_DATA_CATEGORIES) {
    categoryConfigVersions[category] = config.categories[category].configVersion;
  }
  return {
    globalConfigVersion: config.global.configVersion,
    categoryConfigVersions,
    staleDisplayPermitted: false,
  };
}

export type PropertyIntelligenceAuthContext = {
  organizationId: string | null;
  customerId: string | null;
  customer: CustomerPropertyFields;
};

export type PropertyIntelligenceQuery = {
  auth: PropertyIntelligenceAuthContext;
  requestedCategories?: PropertyDataCategory[] | null;
};

export type PropertyIntelligenceServiceDeps = {
  settings: PropertyIntelligenceSettingsRepository;
  cache: PropertyCacheService;
  registry: PropertyProviderRegistry;
  budget: PropertyBudgetGateway;
  planner?: PropertyIntelligenceRequestPlanner;
  usage?: PropertyUsageTracker;
};

export class PropertyIntelligenceService {
  private readonly planner: PropertyIntelligenceRequestPlanner;

  constructor(private readonly deps: PropertyIntelligenceServiceDeps) {
    this.planner = deps.planner ?? createRequestPlanner();
  }

  async getInsights(
    query: PropertyIntelligenceQuery
  ): Promise<PropertyIntelligenceResult> {
    const retrievedAt = new Date().toISOString();
    const config = await this.deps.settings.getResolvedConfig();

    const cachePolicy = buildCachePolicyMeta(config);

    if (!config.global.featureEnabled) {
      return {
        featureEnabled: false,
        identity: null,
        retrievedAt,
        cachePolicy,
        categories: emptyIntelligenceCategories() as PropertyIntelligenceResult["categories"],
      };
    }

    const resolved = resolveCustomerPropertyAddress(query.auth.customer);
    if (!resolved.ok) {
      const categories = emptyIntelligenceCategories() as PropertyIntelligenceResult["categories"];
      for (const category of PROPERTY_DATA_CATEGORIES) {
        categories[category] = emptyCategoryResult(
          category,
          "unavailable",
          null
        );
      }
      return {
        featureEnabled: true,
        identity: null,
        retrievedAt,
        cachePolicy,
        categories,
      };
    }

    const identityRow = await this.deps.cache.ensureSharedIdentity({
      identity: resolved.identity,
      rawAddress: resolved.address,
      aliasKey: resolved.aliasKey,
    });

    this.deps.registry.setConfig({
      defaultProviderId: config.global.defaultProviderId,
      categoryProviders: Object.fromEntries(
        PROPERTY_DATA_CATEGORIES.map((c) => [
          c,
          config.categories[c].providerId,
        ])
      ),
    });

    const plan = await this.planner.plan({
      identity: resolved.identity,
      zipCode: resolved.zipCode,
      requestedCategories: query.requestedCategories,
      config,
      registry: this.deps.registry,
      cache: this.deps.cache,
    });

    const lookup: PropertyLookup = {
      address: resolved.address,
      identity: resolved.identity,
      zipCode: resolved.zipCode,
      organizationId: query.auth.organizationId,
      customerId: query.auth.customerId,
      categories: plan.enabledRequested,
    };

    const results = {
      property_details: emptyCategoryResult<PropertyDetails>(
        "property_details",
        "missing"
      ),
      property_valuation: emptyCategoryResult<PropertyValuation>(
        "property_valuation",
        "missing"
      ),
      nearby_houses: emptyCategoryResult<NearbyListing[]>(
        "nearby_houses",
        "missing"
      ),
      nearby_land: emptyCategoryResult<NearbyListing[]>("nearby_land", "missing"),
      market_statistics: emptyCategoryResult<MarketStatistics>(
        "market_statistics",
        "missing"
      ),
    } as PropertyIntelligenceResult["categories"];

    for (const state of plan.categoryStates) {
      if (state.disposition === "not_requested") {
        results[state.category] = emptyCategoryResult(
          state.category,
          "missing"
        );
        continue;
      }
      if (state.disposition === "disabled") {
        results[state.category] = emptyCategoryResult(
          state.category,
          "disabled"
        );
        continue;
      }
      if (state.disposition === "unsupported") {
        results[state.category] = emptyCategoryResult(
          state.category,
          "unsupported",
          {
            code: "unsupported_capability",
            message: state.message,
            retryable: false,
            providerId: state.providerId,
            category: state.category,
          }
        );
        continue;
      }
      if (state.disposition === "serve_cache") {
        this.deps.usage?.recordCacheHit();
        results[state.category] = this.materializeCacheHit(
          state.category,
          state
        );
      }
      if (state.disposition === "cache_unavailable") {
        this.deps.usage?.recordCacheUnavailable();
        results[state.category] = emptyCategoryResult(
          state.category,
          "unavailable",
          {
            code: "provider_failure",
            message: state.message,
            retryable: true,
            providerId: state.providerId,
            category: state.category,
          }
        );
      }
      if (state.disposition === "fetch") {
        if (state.reason === "expired") this.deps.usage?.recordExpired();
        else this.deps.usage?.recordCacheMiss();
        results[state.category] = emptyCategoryResult(
          state.category,
          state.reason === "expired" ? "expired" : "missing"
        );
      }
    }

    const invalidationGeneration = config.global.configVersion;

    const satisfiedByOverlap = new Set<PropertyDataCategory>();

    for (const operation of plan.operations) {
      if (operation.conditional) {
        if (
          operation.category === "property_details" &&
          satisfiedByOverlap.has("property_details")
        ) {
          continue;
        }
        if (
          operation.dependsOnCategory === "property_valuation" &&
          results.property_valuation.status === "available" &&
          results.property_valuation.data &&
          incidentalDetailsAreComplete(
            results.property_valuation.data as PropertyValuation
          )
        ) {
          const details = extractDetailsFromValuation(
            results.property_valuation.data as PropertyValuation
          )!;
          if (
            isIncidentalPersistAllowed(
              "property_details",
              config.categories.property_details.enabled
            )
          ) {
            await this.persistCategory({
              category: "property_details",
              providerId: operation.providerId,
              cacheKey: operation.cacheKey,
              identityId: identityRow.id,
              payload: details as unknown as Record<string, unknown>,
              ttlSeconds:
                config.categories.property_details.redisTtlSeconds,
              source: results.property_valuation.source,
              expectedInvalidationGeneration: invalidationGeneration,
            });
            results.property_details = availableFromProvider(
              "property_details",
              details,
              results.property_valuation.source ??
                buildDataSource({
                  providerId: operation.providerId,
                  category: "property_details",
                  isMock:
                    this.deps.registry.getProvider(operation.providerId)
                      ?.isMock ?? false,
                })
            );
            satisfiedByOverlap.add("property_details");
            this.deps.usage?.recordEndpointOptimizationAvoided();
          }
          continue;
        }
      }

      const outcome = await this.runOperation(operation, lookup, config);
      await this.applyOperationOutcome(
        results,
        operation,
        outcome,
        config,
        identityRow.id,
        satisfiedByOverlap,
        invalidationGeneration
      );
    }

    return {
      featureEnabled: true,
      identity: resolved.identity,
      retrievedAt,
      cachePolicy,
      categories: results,
    };
  }

  private materializeCacheHit(
    category: PropertyDataCategory,
    state: Extract<
      import("@/lib/property-intelligence/planner/types").CategoryPlanState,
      { disposition: "serve_cache" }
    >
  ): PropertyCategoryResult<never> {
    const payload = state.cache.record.payload;
    if (isNegativePayload(payload)) {
      return emptyCategoryResult(category, "unavailable");
    }

    const source = buildDataSource({
      providerId: state.providerId,
      category,
      isMock: false,
      retrievedAt: state.cache.record.fetchedAt,
      sourceDataAt: state.cache.record.sourceDataAt,
      accessScope: state.cache.record.accessScope,
      schemaVersion: state.cache.record.schemaVersion,
    });

    const data = unwrapCachePayload(category, payload);

    return availableFromCache(
      category,
      data as never,
      source,
      state.cache
    ) as PropertyCategoryResult<never>;
  }

  private async runOperation(
    operation: PlannedProviderOperation,
    lookup: PropertyLookup,
    config: Awaited<
      ReturnType<PropertyIntelligenceSettingsRepository["getResolvedConfig"]>
    >
  ): Promise<ProviderOutcome<unknown>> {
    const provider = this.deps.registry.getProvider(operation.providerId);
    if (!provider) {
      return {
        status: "unsupported",
        error: {
          code: "unsupported_capability",
          message: `Provider ${operation.providerId} is not registered`,
          retryable: false,
          providerId: operation.providerId,
          category: operation.category,
        },
      };
    }

    const settings = config.categories[operation.category];
    const listingsQuery: NearbyListingsQuery = {
      kind:
        operation.category === "nearby_land" ? "land" : "residential",
      radiusMiles: settings.searchRadiusMiles ?? (operation.category === "nearby_land" ? 5 : 1),
      limit: settings.listingLimit ?? 10,
      status: "active",
    };

    const policy = buildCategoryCachePolicy({
      redisTtlSeconds: settings.redisTtlSeconds,
      maxRedisTtlSeconds:
        operation.capability.retention?.maxRedisTtlSeconds ?? null,
      categoryConfigVersion: settings.configVersion,
      permitStaleDisplay: false,
    });

    return this.deps.budget.execute({
      provider,
      operation,
      lookup,
      listingsQuery,
      recheckCache: async () => {
        const hit = await this.deps.cache.getValid({
          providerId: operation.providerId,
          category: operation.category,
          key: operation.cacheKey,
          policy,
        });
        if (hit.status !== "hit" || isNegativePayload(hit.record.payload)) {
          return null;
        }
        const data = unwrapCachePayload(operation.category, hit.record.payload);
        return {
          status: "ok" as const,
          data: data as never,
          source: buildDataSource({
            providerId: operation.providerId,
            category: operation.category,
            isMock: provider.isMock,
            retrievedAt: hit.record.fetchedAt,
            sourceDataAt: hit.record.sourceDataAt,
            accessScope: hit.record.accessScope,
            schemaVersion: hit.record.schemaVersion,
          }),
        };
      },
      run: async (): Promise<ProviderOutcome<unknown>> => {
        switch (operation.operation) {
          case "getPropertyDetails":
            return provider.getPropertyDetails(lookup);
          case "getPropertyValuation":
            return provider.getPropertyValuation(lookup);
          case "getNearbyResidentialListings":
            return provider.getNearbyResidentialListings(lookup, listingsQuery);
          case "getNearbyLandListings":
            return provider.getNearbyLandListings(lookup, listingsQuery);
          case "getMarketStatistics":
            return provider.getMarketStatistics(lookup);
        }
      },
    });
  }

  private async applyOperationOutcome(
    results: PropertyIntelligenceResult["categories"],
    operation: PlannedProviderOperation,
    outcome: ProviderOutcome<unknown>,
    config: Awaited<
      ReturnType<PropertyIntelligenceSettingsRepository["getResolvedConfig"]>
    >,
    identityId: string,
    satisfiedByOverlap: Set<PropertyDataCategory>,
    invalidationGeneration: number
  ) {
    if (outcome.status === "unsupported") {
      results[operation.category] = emptyCategoryResult(
        operation.category,
        "unsupported",
        outcome.error
      );
      return;
    }

    if (outcome.status === "error") {
      const status =
        operation.reason === "expired"
          ? "unavailable"
          : mapProviderErrorToStatus(outcome.error);
      results[operation.category] = emptyCategoryResult(
        operation.category,
        status,
        outcome.error
      );
      return;
    }

    const data = outcome.data;
    const ttlSeconds = resolveEffectiveTtlSeconds(
      config.categories[operation.category].redisTtlSeconds,
      operation.capability.retention?.maxRedisTtlSeconds ?? null
    );
    const fetchedAt = new Date(outcome.source.retrievedAt);
    const expiresAt = computeExpiresAt(fetchedAt, ttlSeconds);
    const remainingTtlSeconds = Math.max(
      0,
      Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
    );

    results[operation.category] = availableFromProvider(
      operation.category,
      data as never,
      outcome.source,
      {
        expiresAt,
        remainingTtlSeconds,
        configVersion: config.categories[operation.category].configVersion,
      }
    );

    await this.persistCategory({
      category: operation.category,
      providerId: operation.providerId,
      cacheKey: operation.cacheKey,
      identityId,
      payload: data,
      ttlSeconds: config.categories[operation.category].redisTtlSeconds,
      maxRedisTtlSeconds:
        operation.capability.retention?.maxRedisTtlSeconds ?? null,
      source: outcome.source,
      expectedInvalidationGeneration: invalidationGeneration,
    });

    if (
      operation.category === "property_valuation" &&
      operation.maySatisfyCategories.includes("property_details") &&
      isIncidentalPersistAllowed(
        "property_details",
        config.categories.property_details.enabled
      ) &&
      incidentalDetailsAreComplete(data as PropertyValuation)
    ) {
      const details = extractDetailsFromValuation(data as PropertyValuation);
      if (details) {
        satisfiedByOverlap.add("property_details");
        const key = this.deps.cache.detailsKey(
          operation.providerId,
          operation.cacheKey.normalizedIdentityKey
        );
        await this.persistCategory({
          category: "property_details",
          providerId: operation.providerId,
          cacheKey: key,
          identityId,
          payload: details as unknown as Record<string, unknown>,
          ttlSeconds: config.categories.property_details.redisTtlSeconds,
          source: outcome.source,
          expectedInvalidationGeneration: invalidationGeneration,
        });
        results.property_details = availableFromProvider(
          "property_details",
          details,
          {
            ...outcome.source,
            category: "property_details",
          }
        );
      }
    }
  }

  private async persistCategory(input: {
    category: PropertyDataCategory;
    providerId: string;
    cacheKey: import("@/lib/property-intelligence/cache/types").BuiltCacheKey;
    identityId: string;
    payload: unknown;
    ttlSeconds: number;
    maxRedisTtlSeconds?: number | null;
    source: import("@/lib/types/property-intelligence").PropertyDataSource | null;
    expectedInvalidationGeneration?: number;
  }) {
    try {
      const wrapped = wrapCachePayload(input.category, input.payload);
      await this.deps.cache.store({
        providerId: input.providerId,
        category: input.category,
        key: input.cacheKey,
        identityId: input.identityId,
        payload: wrapped,
        ttl: {
          redisTtlSeconds: input.ttlSeconds,
          maxRedisTtlSeconds: input.maxRedisTtlSeconds,
        },
        fetchedAt: input.source?.retrievedAt,
        sourceDataAt: input.source?.sourceDataAt,
        expectedInvalidationGeneration: input.expectedInvalidationGeneration,
      });
    } catch (error) {
      this.deps.usage?.recordCacheWriteFailure();
      console.warn("[property-intelligence/cache-write]", {
        category: input.category,
        providerId: input.providerId,
        code:
          error instanceof Error ? error.name : "cache_write_failed",
      });
    }
  }
}

function wrapCachePayload(
  category: PropertyDataCategory,
  payload: unknown
): Record<string, unknown> {
  if (
    (category === "nearby_houses" || category === "nearby_land") &&
    Array.isArray(payload)
  ) {
    return { items: payload };
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return { value: payload };
}

function unwrapCachePayload(
  category: PropertyDataCategory,
  payload: Record<string, unknown>
): unknown {
  if (
    (category === "nearby_houses" || category === "nearby_land") &&
    Array.isArray(payload.items)
  ) {
    return payload.items;
  }
  return payload;
}

export function createPropertyIntelligenceService(
  deps: PropertyIntelligenceServiceDeps
): PropertyIntelligenceService {
  return new PropertyIntelligenceService(deps);
}
