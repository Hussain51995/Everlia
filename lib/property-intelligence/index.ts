export type * from "@/lib/types/property-intelligence";
export {
  PROPERTY_DATA_CATEGORIES,
  PROPERTY_PROVIDER_IDS,
} from "@/lib/types/property-intelligence";

export {
  normalizePropertyAddress,
  normalizeMoney,
  normalizeAreaSqft,
  normalizeCoordinates,
  normalizeListingStatus,
  normalizePropertyType,
  normalizeIsoDate,
  extractZipFromText,
} from "@/lib/property-intelligence/normalize";

export {
  AddressNormalizationService,
  addressNormalizationService,
  buildAliasKey,
} from "@/lib/property-intelligence/address-normalization";

export {
  resolveCustomerPropertyAddress,
  resolvePropertyFromCardCustomer,
} from "@/lib/property-intelligence/customer-property";
export type {
  CustomerPropertyFields,
  ResolvedCustomerProperty,
} from "@/lib/property-intelligence/customer-property";

export {
  PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION,
  DEFAULT_ACCESS_SCOPE,
  DEFAULT_NEGATIVE_TTL_SECONDS,
} from "@/lib/property-intelligence/cache/types";
export type {
  BuiltCacheKey,
  CacheHit,
  CacheMiss,
  CacheLookupResult,
  CachePayload,
  CacheRecord,
  PropertyIdentityRecord,
} from "@/lib/property-intelligence/cache/types";

export {
  buildCacheKey,
  buildPropertyDetailsCacheKey,
  buildPropertyValuationCacheKey,
  buildNearbyListingsCacheKey,
  buildMarketStatisticsCacheKey,
  fingerprintParams,
  stableStringify,
} from "@/lib/property-intelligence/cache/keys";

export {
  evaluateCacheFreshness,
  assertSafeCachePayload,
  computeExpiresAt,
  isNegativePayload,
  resolveEffectiveTtlSeconds,
  computeEffectiveExpiresAt,
} from "@/lib/property-intelligence/cache/freshness";

export {
  PropertyCachePolicyService,
  createCachePolicyService,
  buildCategoryCachePolicy,
} from "@/lib/property-intelligence/cache/policy";

export {
  PropertyCacheInvalidationService,
  createCacheInvalidationService,
} from "@/lib/property-intelligence/cache/invalidation";
export type {
  CacheInvalidationTarget,
  CacheInvalidationResult,
} from "@/lib/property-intelligence/cache/invalidation";

export {
  PropertyCacheCleanupService,
  createCacheCleanupService,
  DEFAULT_CACHE_CLEANUP_CONFIG,
} from "@/lib/property-intelligence/cache/cleanup";
export type {
  PropertyCacheCleanupConfig,
  PropertyCacheCleanupReport,
} from "@/lib/property-intelligence/cache/cleanup";

export {
  MemoryPropertyFetchLockRepository,
  SupabasePropertyFetchLockRepository,
} from "@/lib/property-intelligence/cache/fetch-locks";
export type { PropertyFetchLockRepository } from "@/lib/property-intelligence/cache/fetch-locks";

export {
  MemoryPropertyIdentityRepository,
  SupabasePropertyIdentityRepository,
} from "@/lib/property-intelligence/cache/identity-repository";
export type { PropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";

export {
  MemoryPropertyCacheRepository,
  SupabasePropertyCacheRepository,
} from "@/lib/property-intelligence/cache/cache-repository";
export type { PropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";

export {
  PropertyCacheService,
  createPropertyCacheService,
} from "@/lib/property-intelligence/cache/cache-service";

export {
  MemoryPropertyIntelligenceSettingsRepository,
  SupabasePropertyIntelligenceSettingsRepository,
} from "@/lib/property-intelligence/settings/repository";
export type {
  PropertyIntelligenceSettingsRepository,
} from "@/lib/property-intelligence/settings/repository";
export type {
  PropertyIntelligenceGlobalSettings,
  PropertyIntelligenceCategorySettings,
  PropertyIntelligenceResolvedConfig,
} from "@/lib/property-intelligence/settings/types";

export {
  createRequestPlanner,
  PropertyIntelligenceRequestPlanner,
} from "@/lib/property-intelligence/planner/planner";
export {
  propertyDetailsSatisfiesRequiredCoverage,
  incidentalDetailsAreComplete,
} from "@/lib/property-intelligence/planner/required-fields";

export {
  createStubBudgetGateway,
  StubPropertyBudgetGateway,
} from "@/lib/property-intelligence/execution/budget-gateway";
export type { PropertyBudgetGateway } from "@/lib/property-intelligence/execution/budget-gateway";

export {
  createBudgetService,
  PropertyBudgetService,
} from "@/lib/property-intelligence/execution/budget-service";
export {
  MemoryPropertyBudgetRepository,
  SupabasePropertyBudgetRepository,
} from "@/lib/property-intelligence/execution/budget-repository";
export {
  createProviderExecutionGateway,
  PropertyProviderExecutionGateway,
} from "@/lib/property-intelligence/execution/provider-gateway";
export {
  MemoryPropertyFetchDedupeRepository,
  SupabasePropertyFetchDedupeRepository,
  buildFetchLockKey,
} from "@/lib/property-intelligence/execution/dedupe";
export {
  createUsageTracker,
  PropertyUsageTracker,
  MemoryPropertyUsageRepository,
  SupabasePropertyUsageRepository,
} from "@/lib/property-intelligence/execution/usage-tracker";
export {
  resolveProviderMonthlyBudget,
  DEFAULT_PROVIDER_ACCOUNT_BUDGET,
} from "@/lib/property-intelligence/execution/budget-config";
export {
  currentBillingPeriodKey,
  nextBillingPeriodKey,
} from "@/lib/property-intelligence/execution/billing-period";
export {
  isRetryableProviderError,
  DEFAULT_RETRY_POLICY,
} from "@/lib/property-intelligence/execution/retry";
export { checkPublicInsightsRateLimit } from "@/lib/property-intelligence/execution/public-rate-limit";

export {
  createPropertyIntelligenceService,
  PropertyIntelligenceService,
} from "@/lib/property-intelligence/service/property-intelligence-service";
export { createPropertyInsightsService } from "@/lib/property-intelligence/service/factory";

export {
  PROPERTY_INSIGHTS_NO_STORE_HEADERS,
  sanitizeInsightsForPublic,
} from "@/lib/property-intelligence/api/contract";

export {
  createBrowserCacheService,
  PropertyBrowserCacheService,
  assertPublicSafeBrowserPayload,
} from "@/lib/property-intelligence/browser/cache-service";
export {
  MemoryBrowserCacheStorage,
  IndexedDbBrowserCacheStorage,
  getDefaultBrowserCacheStorage,
  browserCacheStorageKey,
} from "@/lib/property-intelligence/browser/storage";
export {
  computeBrowserExpiresAt,
  isBrowserRecordFresh,
} from "@/lib/property-intelligence/browser/policy";
export {
  buildResponseContextId,
  buildPropertyIntelligenceEtag,
} from "@/lib/property-intelligence/browser/context-id";
export { createBrowserCacheTelemetry } from "@/lib/property-intelligence/browser/telemetry";
export { buildPropertyIntelligenceBootstrap } from "@/lib/property-intelligence/bootstrap/build-respond-bootstrap";
export type {
  BrowserCacheRecord,
  PropertyIntelligenceBootstrap,
  BrowserCachePolicySnapshot,
} from "@/lib/property-intelligence/browser/types";
export {
  DEFAULT_BROWSER_TTL_SECONDS,
  BROWSER_CACHE_SCHEMA_VERSION,
} from "@/lib/property-intelligence/browser/types";

export {
  createProviderError,
  sanitizeProviderMessage,
  mapHttpStatusToErrorCode,
} from "@/lib/property-intelligence/errors";

export type {
  PropertyDataProvider,
  CategoryProviderMap,
  ProviderRegistryConfig,
} from "@/lib/property-intelligence/providers/types";
export { buildDataSource } from "@/lib/property-intelligence/providers/types";

export {
  PropertyProviderRegistry,
  ProviderRegistryError,
  unsupportedOutcome,
} from "@/lib/property-intelligence/providers/registry";

export {
  RentCastPropertyDataProvider,
  createRentCastProvider,
} from "@/lib/property-intelligence/providers/rentcast/adapter";
export { createRentCastHttpClient } from "@/lib/property-intelligence/providers/rentcast/http";
export { RENTCAST_CAPABILITIES } from "@/lib/property-intelligence/providers/rentcast/capabilities";

export {
  MockPropertyDataProvider,
  createMockProvider,
} from "@/lib/property-intelligence/providers/mock/provider";
export type {
  MockProviderOptions,
  MockProviderScenario,
} from "@/lib/property-intelligence/providers/mock/provider";

export {
  AltavistaPropertyDataProvider,
  createAltavistaProvider,
} from "@/lib/property-intelligence/providers/altavista/provider";

import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { createRentCastProvider } from "@/lib/property-intelligence/providers/rentcast/adapter";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import type { ProviderRegistryConfig } from "@/lib/property-intelligence/providers/types";

export function createPropertyProviderRegistry(
  options?: Partial<ProviderRegistryConfig> & { includeMock?: boolean }
): PropertyProviderRegistry {
  const registry = new PropertyProviderRegistry({
    defaultProviderId: options?.defaultProviderId ?? "rentcast",
    categoryProviders: options?.categoryProviders ?? {},
  });
  registry.register(createRentCastProvider());
  if (options?.includeMock) {
    registry.register(createMockProvider());
  }
  return registry;
}
