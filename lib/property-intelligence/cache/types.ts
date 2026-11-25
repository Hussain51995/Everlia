import type {
  NearbyListingsQuery,
  PropertyDataCategory,
  PropertyDataSource,
  PropertyIdentity,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";

export const PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION = 1;

export const DEFAULT_ACCESS_SCOPE = "public_qr";

export const DEFAULT_NEGATIVE_TTL_SECONDS = 60 * 60;

export type CacheNegativeReason = "not_found" | "empty";

export type CacheNegativePayload = {
  kind: "negative";
  reason: CacheNegativeReason;
  message?: string;
};

export type CachePayload = Record<string, unknown> | CacheNegativePayload;

export type CacheRequestParams = {
  [key: string]: unknown;
};

export type CacheKeyInput = {
  providerId: PropertyProviderId;
  providerDataset?: string | null;
  category: PropertyDataCategory;
  normalizedIdentityKey: string;
  requestParams?: CacheRequestParams;
  schemaVersion?: number;
  accessScope?: string;
};

export type BuiltCacheKey = {
  cacheKey: string;
  requestParamsFingerprint: string;
  normalizedIdentityKey: string;
  schemaVersion: number;
  accessScope: string;
  providerDataset: string | null;
  requestParams: CacheRequestParams;
};

export type PropertyIdentityRecord = {
  id: string;
  normalizedKey: string;
  countryCode: string;
  addressLine1Normalized: string | null;
  unitNormalized: string | null;
  localityNormalized: string | null;
  adminAreaNormalized: string | null;
  postalNormalized: string | null;
  displayAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CacheRecord = {
  id: string;
  cacheKey: string;
  providerId: string;
  providerDataset: string | null;
  category: PropertyDataCategory;
  identityId: string | null;
  normalizedIdentityKey: string;
  requestParams: CacheRequestParams;
  requestParamsFingerprint: string;
  payload: CachePayload;
  schemaVersion: number;
  accessScope: string;
  fetchedAt: string;
  expiresAt: string;
  sourceDataAt: string | null;
  status: "active" | "invalidated";
  invalidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreCacheInput = {
  key: BuiltCacheKey;
  providerId: PropertyProviderId;
  category: PropertyDataCategory;
  identityId?: string | null;
  payload: CachePayload;
  fetchedAt: string;
  expiresAt: string;
  sourceDataAt?: string | null;
};

export type CacheFreshnessPolicy = {
  databaseTtlSeconds: number;
  maxDatabaseTtlSeconds?: number | null;
  categoryConfigVersion?: number;
  permitStaleDisplay?: boolean;
};

export type CacheLookupRequest = {
  key: BuiltCacheKey;
  category: PropertyDataCategory;
  providerId: PropertyProviderId;
  policy?: CacheFreshnessPolicy | null;
};

export type CacheHit = {
  status: "hit";
  record: CacheRecord;
  isNegative: boolean;
  remainingTtlSeconds: number;
  effectiveExpiresAt: string;
  tightenedByConfig: boolean;
  categoryConfigVersion?: number;
};

export type CacheMiss = {
  status: "miss";
  reason:
    | "not_found"
    | "expired"
    | "invalidated"
    | "schema_mismatch"
    | "scope_mismatch"
    | "provider_mismatch"
    | "category_disabled";
  record?: CacheRecord;
  effectiveExpiresAt?: string;
  tightenedByConfig?: boolean;
  categoryConfigVersion?: number;
};

export type CacheLookupResult = CacheHit | CacheMiss;

export type CategoryTtlSeconds = {
  databaseTtlSeconds: number;
  maxDatabaseTtlSeconds?: number | null;
};

export type CacheServiceOptions = {
  schemaVersion?: number;
  accessScope?: string;
  negativeTtlSeconds?: number;
  isCategoryEnabled?: (category: PropertyDataCategory) => boolean;
  now?: () => Date;
};

export type PropertySearchCenter = {
  normalizedIdentityKey: string;
  identity?: PropertyIdentity;
};

export type ListingsCacheParams = NearbyListingsQuery & {
  filters?: Record<string, unknown>;
};

export type MarketCacheParams = {
  countryCode: string;
  zipCode: string;
  dataType?: string;
};

export type PropertyDataSourceLite = Pick<
  PropertyDataSource,
  | "providerId"
  | "providerDataset"
  | "category"
  | "retrievedAt"
  | "sourceDataAt"
  | "accessScope"
  | "schemaVersion"
  | "isMock"
>;
