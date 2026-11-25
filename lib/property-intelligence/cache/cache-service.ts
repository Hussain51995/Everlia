import type { PropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import type { PropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
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
  CacheServiceOptions,
  CategoryTtlSeconds,
  ListingsCacheParams,
  MarketCacheParams,
  StoreCacheInput,
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
};

export class PropertyCacheService {
  private readonly schemaVersion: number;
  private readonly accessScope: string;
  private readonly negativeTtlSeconds: number;
  private readonly isCategoryEnabled: (category: PropertyDataCategory) => boolean;
  private readonly now: () => Date;
  private readonly policyService: PropertyCachePolicyService;

  constructor(
    private readonly cacheRepo: PropertyCacheRepository,
    private readonly identityRepo: PropertyIdentityRepository,
    options?: CacheServiceOptions
  ) {
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

  get repository(): PropertyCacheRepository {
    return this.cacheRepo;
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

    const record = await this.cacheRepo.getByCacheKey(input.key.cacheKey);
    return evaluateCacheFreshness({
      record,
      expected: {
        providerId: input.providerId,
        category: input.category,
        cacheKey: input.key.cacheKey,
        schemaVersion: this.schemaVersion,
        accessScope: this.accessScope,
      },
      policy: input.policy,
      now: this.now(),
    });
  }

  async getMany(
    requests: CacheLookupRequest[]
  ): Promise<Map<string, CacheLookupResult>> {
    const results = new Map<string, CacheLookupResult>();
    if (requests.length === 0) return results;

    const enabled = requests.filter((r) => {
      if (!this.isCategoryEnabled(r.category)) {
        results.set(r.key.cacheKey, {
          status: "miss",
          reason: "category_disabled",
        });
        return false;
      }
      return true;
    });

    const keys = enabled.map((r) => r.key.cacheKey);
    const rows = await this.cacheRepo.getByCacheKeys(keys);
    const byKey = new Map(rows.map((r) => [r.cacheKey, r]));

    for (const req of enabled) {
      results.set(
        req.key.cacheKey,
        evaluateCacheFreshness({
          record: byKey.get(req.key.cacheKey),
          expected: {
            providerId: req.providerId,
            category: req.category,
            cacheKey: req.key.cacheKey,
            schemaVersion: this.schemaVersion,
            accessScope: this.accessScope,
          },
          policy: req.policy,
          now: this.now(),
        })
      );
    }

    return results;
  }

  async store(input: StoreCategoryInput) {
    assertSafeCachePayload(input.payload);
    const fetchedAt = input.fetchedAt ?? utcNowIso(this.now());
    const write = this.policyService.computeWriteExpiry({
      fetchedAt,
      databaseTtlSeconds: input.ttl.databaseTtlSeconds,
      maxDatabaseTtlSeconds: input.ttl.maxDatabaseTtlSeconds,
    });

    const storeInput: StoreCacheInput = {
      key: input.key,
      providerId: input.providerId,
      category: input.category,
      identityId: input.identityId ?? null,
      payload: input.payload,
      fetchedAt: write.fetchedAt,
      expiresAt: write.expiresAt,
      sourceDataAt: input.sourceDataAt ?? null,
    };

    return this.cacheRepo.upsert(storeInput);
  }

  async storeNegative(input: {
    providerId: PropertyProviderId;
    category: PropertyDataCategory;
    key: BuiltCacheKey;
    reason: CacheNegativeReason;
    message?: string;
    identityId?: string | null;
    ttlSeconds?: number;
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
      ttl: { databaseTtlSeconds: ttl },
      fetchedAt,
    });
  }

  async invalidateCategory(
    category: PropertyDataCategory,
    normalizedIdentityKey?: string | null
  ): Promise<number> {
    return this.cacheRepo.invalidateByCategory(
      category,
      normalizedIdentityKey ?? null,
      utcNowIso(this.now())
    );
  }

  async invalidateProperty(normalizedIdentityKey: string): Promise<number> {
    return this.cacheRepo.invalidateByIdentityKey(
      normalizedIdentityKey,
      utcNowIso(this.now())
    );
  }

  async invalidateProvider(providerId: string): Promise<number> {
    return this.cacheRepo.invalidateByProvider(
      providerId,
      utcNowIso(this.now())
    );
  }

  async invalidateZip(input: {
    countryCode: string;
    zipCode: string;
  }): Promise<number> {
    const prefix = `market:${input.countryCode.toUpperCase()}:${input.zipCode.trim()}`;
    return this.cacheRepo.invalidateByIdentityKeyPrefix(
      prefix,
      utcNowIso(this.now())
    );
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
}

export function createPropertyCacheService(
  cacheRepo: PropertyCacheRepository,
  identityRepo: PropertyIdentityRepository,
  options?: CacheServiceOptions
): PropertyCacheService {
  return new PropertyCacheService(cacheRepo, identityRepo, options);
}

export { isNegativePayload };
