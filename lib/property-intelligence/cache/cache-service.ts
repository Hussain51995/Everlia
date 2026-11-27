import type { PropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import {
  buildCacheKey,
  buildMarketStatisticsCacheKey,
  buildNearbyListingsCacheKey,
  buildPropertyDetailsCacheKey,
  buildPropertyValuationCacheKey,
} from "@/lib/property-intelligence/cache/keys";
import {
  assertSafeCachePayload,
  evaluateCacheFreshness,
  isNegativePayload,
  utcNowIso,
} from "@/lib/property-intelligence/cache/freshness";
import {
  createCachePolicyService,
  type PropertyCachePolicyService,
} from "@/lib/property-intelligence/cache/policy";
import type {
  BuiltCacheKey,
  CacheFreshnessPolicy,
  CacheLookupRequest,
  CacheLookupResult,
  CacheNegativeReason,
  CachePayload,
  CacheRecord,
  CacheServiceOptions,
  CategoryTtlSeconds,
  ListingsCacheParams,
  MarketCacheParams,
} from "@/lib/property-intelligence/cache/types";
import {
  DEFAULT_ACCESS_SCOPE,
  DEFAULT_NEGATIVE_TTL_SECONDS,
  PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION,
} from "@/lib/property-intelligence/cache/types";
import type {
  PropertyDataCategory,
  PropertyIdentity,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";
import type { CacheProvider } from "@/lib/property-intelligence/cache/provider/types";
import {
  createPropertyCacheEntry,
} from "@/lib/property-intelligence/cache/provider/entry-schema";
import {
  redisStorageKeyFromBuiltCacheKey,
} from "@/lib/property-intelligence/cache/provider/redis-keys";
import {
  resolveRedisWriteTtl,
} from "@/lib/property-intelligence/cache/provider/ttl";
import {
  resolveRedisCacheEnvironment,
} from "@/lib/property-intelligence/cache/provider/config";
import {
  CacheProviderError,
  isCacheUnavailableError,
} from "@/lib/property-intelligence/cache/provider/errors";
import type { PropertyCacheIndexStore } from "@/lib/property-intelligence/cache/provider/index-store";
import { MemoryPropertyCacheIndexStore } from "@/lib/property-intelligence/cache/provider/index-store";
import { randomUUID } from "crypto";

export type GetValidInput = {
  providerId: PropertyProviderId;
  category: PropertyDataCategory;
  key: BuiltCacheKey;
  policy?: CacheFreshnessPolicy | null;
};

export type StoreCategoryInput = {
  providerId: PropertyProviderId;
  category: PropertyDataCategory;
  key: BuiltCacheKey;
  payload: CachePayload;
  ttl: CategoryTtlSeconds;
  identityId?: string | null;
  sourceDataAt?: string | null;
  fetchedAt?: string;
  expectedInvalidationGeneration?: number;
};

export type PropertyCacheServiceDeps = {
  provider: CacheProvider;
  identityRepo: PropertyIdentityRepository;
  indexStore?: PropertyCacheIndexStore;
  environment?: string;
  getInvalidationGeneration?: () => number | Promise<number>;
  options?: CacheServiceOptions;
  onOperationalError?: (event: {
    code: string;
    message: string;
    operation: string;
  }) => void;
};

export class PropertyCacheService {
  private readonly schemaVersion: number;
  private readonly accessScope: string;
  private readonly negativeTtlSeconds: number;
  private readonly isCategoryEnabled: (category: PropertyDataCategory) => boolean;
  private readonly now: () => Date;
  private readonly policyService: PropertyCachePolicyService;
  private readonly provider: CacheProvider;
  private readonly indexStore: PropertyCacheIndexStore;
  private readonly environment: string;
  private readonly getInvalidationGeneration: () => number | Promise<number>;
  private readonly onOperationalError?: PropertyCacheServiceDeps["onOperationalError"];

  constructor(
    private readonly identityRepo: PropertyIdentityRepository,
    deps: PropertyCacheServiceDeps
  ) {
    this.provider = deps.provider;
    this.indexStore = deps.indexStore ?? new MemoryPropertyCacheIndexStore();
    this.environment =
      deps.environment ?? resolveRedisCacheEnvironment(process.env);
    this.getInvalidationGeneration =
      deps.getInvalidationGeneration ?? (() => 1);
    this.onOperationalError = deps.onOperationalError;

    const options = deps.options;
    this.schemaVersion =
      options?.schemaVersion ?? PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION;
    this.accessScope = options?.accessScope ?? DEFAULT_ACCESS_SCOPE;
    this.negativeTtlSeconds =
      options?.negativeTtlSeconds ?? DEFAULT_NEGATIVE_TTL_SECONDS;
    this.isCategoryEnabled = options?.isCategoryEnabled ?? (() => true);
    this.now = options?.now ?? (() => new Date());
    this.policyService = createCachePolicyService();
  }

  get identityRepository(): PropertyIdentityRepository {
    return this.identityRepo;
  }

  get cacheProvider(): CacheProvider {
    return this.provider;
  }

  get policy(): PropertyCachePolicyService {
    return this.policyService;
  }

  async ensureSharedIdentity(input: {
    identity: PropertyIdentity;
    rawAddress: string;
    aliasKey?: string;
  }) {
    return this.identityRepo.ensureIdentity(input);
  }

  async getValid(input: GetValidInput): Promise<CacheLookupResult> {
    if (!this.isCategoryEnabled(input.category)) {
      return { status: "miss", reason: "category_disabled" };
    }

    const generation = await this.resolveGeneration();
    const storageKey = this.storageKey(
      input.key,
      input.providerId,
      input.category,
      generation
    );

    try {
      const result = await this.provider.get(storageKey);
      return this.mapGetResult(result, input, storageKey);
    } catch (error) {
      return this.unavailableResult(error, "get");
    }
  }

  async getMany(
    requests: CacheLookupRequest[]
  ): Promise<Map<string, CacheLookupResult>> {
    const results = new Map<string, CacheLookupResult>();
    if (requests.length === 0) return results;

    const generation = await this.resolveGeneration();
    const enabled: Array<CacheLookupRequest & { storageKey: string }> = [];

    for (const r of requests) {
      if (!this.isCategoryEnabled(r.category)) {
        results.set(r.key.cacheKey, {
          status: "miss",
          reason: "category_disabled",
        });
        continue;
      }
      enabled.push({
        ...r,
        storageKey: this.storageKey(
          r.key,
          r.providerId,
          r.category,
          generation
        ),
      });
    }

    if (enabled.length === 0) return results;

    try {
      const batch = await this.provider.getMany(enabled.map((e) => e.storageKey));
      for (const req of enabled) {
        const raw = batch.get(req.storageKey) ?? { status: "miss" as const };
        results.set(
          req.key.cacheKey,
          this.mapGetResult(raw, req, req.storageKey)
        );
      }
    } catch (error) {
      const unavailable = this.unavailableResult(error, "mget");
      for (const req of enabled) {
        results.set(req.key.cacheKey, unavailable);
      }
    }

    return results;
  }

  async store(input: StoreCategoryInput): Promise<CacheRecord | null> {
    assertSafeCachePayload(input.payload);

    const liveGeneration = await this.resolveGeneration();
    if (
      input.expectedInvalidationGeneration != null &&
      liveGeneration !== input.expectedInvalidationGeneration
    ) {
      this.onOperationalError?.({
        code: "stale_generation",
        message: "Skipped cache write after invalidation generation advanced",
        operation: "store",
      });
      return null;
    }

    const fetchedAt = input.fetchedAt ?? utcNowIso(this.now());
    const writeTtl = resolveRedisWriteTtl({
      configuredTtlSeconds: input.ttl.redisTtlSeconds,
      maxProviderTtlSeconds: input.ttl.maxRedisTtlSeconds,
      fetchedAt,
      now: this.now(),
    });

    const entry = createPropertyCacheEntry({
      providerId: String(input.providerId),
      providerDataset: input.key.providerDataset,
      category: input.category,
      schemaVersion: input.key.schemaVersion,
      normalizedIdentityKey: input.key.normalizedIdentityKey,
      requestParamsFingerprint: input.key.requestParamsFingerprint,
      accessScope: input.key.accessScope,
      fetchedAt: writeTtl.fetchedAt,
      sourceDataAt: input.sourceDataAt ?? null,
      expiresAt: writeTtl.expiresAt,
      invalidationGeneration: liveGeneration,
      payload: input.payload,
    });

    const storageKey = this.storageKey(
      input.key,
      input.providerId,
      input.category,
      liveGeneration
    );

    try {
      await this.provider.set({
        key: storageKey,
        entry,
        ttlSeconds: writeTtl.ttlSeconds,
      });
      await this.indexStore.track({
        storageKey,
        providerId: String(input.providerId),
        category: input.category,
        normalizedIdentityKey: input.key.normalizedIdentityKey,
        environment: this.environment,
      });
    } catch (error) {
      this.onOperationalError?.({
        code:
          error instanceof CacheProviderError ? error.code : "write_failed",
        message:
          error instanceof Error ? error.message : "Redis cache write failed",
        operation: "store",
      });
      throw error instanceof CacheProviderError
        ? error
        : new CacheProviderError({
            code: "write_failed",
            message:
              error instanceof Error
                ? error.message
                : "Redis cache write failed",
            retryable: true,
            cause: error,
          });
    }

    return entryToRecord(entry, input.key.cacheKey, input.identityId ?? null);
  }

  async storeNegative(input: {
    providerId: PropertyProviderId;
    category: PropertyDataCategory;
    key: BuiltCacheKey;
    reason: CacheNegativeReason;
    message?: string;
    identityId?: string | null;
    ttlSeconds?: number;
    expectedInvalidationGeneration?: number;
  }) {
    const fetchedAt = utcNowIso(this.now());
    const ttl = input.ttlSeconds ?? this.negativeTtlSeconds;
    return this.store({
      providerId: input.providerId,
      category: input.category,
      key: input.key,
      identityId: input.identityId,
      payload: {
        kind: "negative",
        reason: input.reason,
        message: input.message,
      },
      ttl: { redisTtlSeconds: ttl },
      fetchedAt,
      expectedInvalidationGeneration: input.expectedInvalidationGeneration,
    });
  }

  async invalidateCategory(
    category: PropertyDataCategory,
    normalizedIdentityKey?: string | null
  ): Promise<number> {
    const byCategory = await this.indexStore.listByCategory(
      this.environment,
      category
    );
    if (!normalizedIdentityKey) {
      return this.deleteStorageKeys(byCategory);
    }
    const byIdentity = new Set(
      await this.indexStore.listByIdentity(
        this.environment,
        normalizedIdentityKey
      )
    );
    return this.deleteStorageKeys(byCategory.filter((k) => byIdentity.has(k)));
  }

  async invalidateProperty(normalizedIdentityKey: string): Promise<number> {
    const keys = await this.indexStore.listByIdentity(
      this.environment,
      normalizedIdentityKey
    );
    return this.deleteStorageKeys(keys);
  }

  async invalidateProvider(providerId: string): Promise<number> {
    const keys = await this.indexStore.listByProvider(
      this.environment,
      providerId
    );
    return this.deleteStorageKeys(keys);
  }

  async invalidateZip(input: {
    countryCode: string;
    zipCode: string;
  }): Promise<number> {
    const prefix = `market:${input.countryCode.toUpperCase()}:${input.zipCode.trim()}`;
    const keys = await this.indexStore.listByIdentityPrefix(
      this.environment,
      prefix
    );
    return this.deleteStorageKeys(keys);
  }

  async invalidateAll(): Promise<number> {
    const keys = await this.indexStore.listAll(this.environment, 5_000);
    return this.deleteStorageKeys(keys);
  }

  async searchByIdentityKeyPrefix(
    prefix: string,
    limit = 50
  ): Promise<CacheRecord[]> {
    const keys = (
      await this.indexStore.listByIdentityPrefix(this.environment, prefix)
    ).slice(0, limit);
    return this.loadRecords(keys);
  }

  async listRecent(limit = 50): Promise<CacheRecord[]> {
    const keys = await this.indexStore.listRecent(this.environment, limit);
    return this.loadRecords(keys);
  }

  detailsKey(
    providerId: PropertyProviderId,
    normalizedIdentityKey: string,
    params?: Record<string, unknown>
  ): BuiltCacheKey {
    return buildPropertyDetailsCacheKey({
      providerId,
      normalizedIdentityKey,
      params,
      schemaVersion: this.schemaVersion,
      accessScope: this.accessScope,
    });
  }

  valuationKey(
    providerId: PropertyProviderId,
    normalizedIdentityKey: string,
    valuationParams?: Record<string, unknown>
  ): BuiltCacheKey {
    return buildPropertyValuationCacheKey({
      providerId,
      normalizedIdentityKey,
      valuationParams,
      schemaVersion: this.schemaVersion,
      accessScope: this.accessScope,
    });
  }

  nearbyKey(
    providerId: PropertyProviderId,
    category: "nearby_houses" | "nearby_land",
    searchCenterKey: string,
    query: ListingsCacheParams
  ): BuiltCacheKey {
    return buildNearbyListingsCacheKey({
      providerId,
      category,
      searchCenterKey,
      query,
      schemaVersion: this.schemaVersion,
      accessScope: this.accessScope,
    });
  }

  marketKey(
    providerId: PropertyProviderId,
    market: MarketCacheParams
  ): BuiltCacheKey {
    return buildMarketStatisticsCacheKey({
      providerId,
      market,
      schemaVersion: this.schemaVersion,
      accessScope: this.accessScope,
    });
  }

  genericKey(input: {
    providerId: PropertyProviderId;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    requestParams?: Record<string, unknown>;
  }): BuiltCacheKey {
    return buildCacheKey({
      ...input,
      schemaVersion: this.schemaVersion,
      accessScope: this.accessScope,
    });
  }

  private storageKey(
    key: BuiltCacheKey,
    providerId: PropertyProviderId,
    category: PropertyDataCategory,
    invalidationGeneration: number
  ): string {
    return redisStorageKeyFromBuiltCacheKey({
      key,
      providerId: String(providerId),
      category,
      environment: this.environment,
      invalidationGeneration,
    });
  }

  private async resolveGeneration(): Promise<number> {
    const value = await this.getInvalidationGeneration();
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  private mapGetResult(
    result: Awaited<ReturnType<CacheProvider["get"]>>,
    expected: {
      providerId: PropertyProviderId;
      category: PropertyDataCategory;
      key: BuiltCacheKey;
      policy?: CacheFreshnessPolicy | null;
    },
    storageKey: string
  ): CacheLookupResult {
    if (result.status === "unavailable") {
      this.onOperationalError?.({
        code: result.error.code,
        message: result.error.message,
        operation: "get",
      });
      return {
        status: "miss",
        reason: "cache_unavailable",
      };
    }

    if (result.status === "miss") {
      return { status: "miss", reason: "not_found" };
    }

    if (result.status === "invalid") {
      return { status: "miss", reason: "invalid_payload" };
    }

    if (result.status === "expired") {
      const record = entryToRecord(
        result.entry,
        expected.key.cacheKey,
        null
      );
      return {
        status: "miss",
        reason: "expired",
        record,
        effectiveExpiresAt: result.entry.expiresAt,
      };
    }

    void storageKey;
    const record = entryToRecord(result.entry, expected.key.cacheKey, null);
    return evaluateCacheFreshness({
      record,
      expected: {
        providerId: expected.providerId,
        category: expected.category,
        cacheKey: expected.key.cacheKey,
        schemaVersion: this.schemaVersion,
        accessScope: this.accessScope,
      },
      policy: expected.policy,
      now: this.now(),
    });
  }

  private unavailableResult(
    error: unknown,
    operation: string
  ): CacheLookupResult {
    const message =
      error instanceof Error ? error.message : "Cache unavailable";
    this.onOperationalError?.({
      code: isCacheUnavailableError(error) ? error.code : "unavailable",
      message,
      operation,
    });
    return { status: "miss", reason: "cache_unavailable" };
  }

  private async deleteStorageKeys(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    try {
      const deleted = await this.provider.deleteMany(keys);
      await this.indexStore.untrackKeys(this.environment, keys);
      return deleted;
    } catch (error) {
      this.onOperationalError?.({
        code: "unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete Redis cache keys",
        operation: "invalidate",
      });
      return 0;
    }
  }

  private async loadRecords(keys: string[]): Promise<CacheRecord[]> {
    if (keys.length === 0) return [];
    try {
      const batch = await this.provider.getMany(keys);
      const out: CacheRecord[] = [];
      for (const key of keys) {
        const result = batch.get(key);
        if (!result || result.status === "miss" || result.status === "unavailable") {
          continue;
        }
        if (result.status === "invalid") continue;
        out.push(entryToRecord(result.entry, key, null));
      }
      return out;
    } catch {
      return [];
    }
  }
}

function entryToRecord(
  entry: {
    providerId: string;
    providerDataset: string | null;
    category: PropertyDataCategory;
    schemaVersion: number;
    normalizedIdentityKey: string;
    requestParamsFingerprint: string;
    accessScope: string;
    fetchedAt: string;
    sourceDataAt: string | null;
    expiresAt: string;
    payload: CachePayload;
  },
  storageKey: string,
  identityId: string | null
): CacheRecord {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    cacheKey: storageKey,
    providerId: entry.providerId,
    providerDataset: entry.providerDataset,
    category: entry.category,
    identityId,
    normalizedIdentityKey: entry.normalizedIdentityKey,
    requestParams: {},
    requestParamsFingerprint: entry.requestParamsFingerprint,
    payload: entry.payload,
    schemaVersion: entry.schemaVersion,
    accessScope: entry.accessScope,
    fetchedAt: entry.fetchedAt,
    expiresAt: entry.expiresAt,
    sourceDataAt: entry.sourceDataAt,
    status: "active",
    invalidatedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createPropertyCacheService(
  deps: PropertyCacheServiceDeps
): PropertyCacheService {
  return new PropertyCacheService(deps.identityRepo, deps);
}

export { isNegativePayload };
