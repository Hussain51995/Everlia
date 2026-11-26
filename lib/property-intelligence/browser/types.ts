import type {
  PropertyDataCategory,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";
import {
  DEFAULT_BROWSER_TTL_SECONDS,
} from "@/lib/property-intelligence/browser/ttl";

export const BROWSER_CACHE_SCHEMA_VERSION = 2;

export { DEFAULT_BROWSER_TTL_SECONDS };

export type ResponseContextId = string;

export type BrowserCacheRecord = {
  responseContextId: ResponseContextId;
  propertyIdentityKey: string;
  category: PropertyDataCategory;
  providerId: PropertyProviderId;
  schemaVersion: number;
  categoryConfigVersion: number;
  invalidationVersion: number;
  providerFetchedAt: string;
  sourceCacheExpiresAt: string;
  browserExpiresAt: string;
  data: unknown;
  writtenAt: string;
};

export type LegacyBrowserCacheRecordV1 = Omit<
  BrowserCacheRecord,
  "sourceCacheExpiresAt"
> & {
  databaseExpiresAt?: string;
  sourceCacheExpiresAt?: string;
};

export type BrowserCacheKeyParts = {
  responseContextId: ResponseContextId;
  propertyIdentityKey: string;
  category: PropertyDataCategory;
  providerId: PropertyProviderId;
};

export type BrowserCacheLookupResult =
  | { status: "hit"; record: BrowserCacheRecord; remainingTtlSeconds: number }
  | {
      status: "miss";
      reason:
        | "not_found"
        | "expired"
        | "schema_mismatch"
        | "config_mismatch"
        | "invalidation"
        | "provider_mismatch"
        | "identity_mismatch"
        | "context_mismatch"
        | "storage_unavailable"
        | "category_disabled"
        | "browser_caching_disabled"
        | "legacy_incompatible";
      record?: BrowserCacheRecord;
    };

export type BrowserCacheWriteInput = {
  responseContextId: ResponseContextId;
  propertyIdentityKey: string;
  category: PropertyDataCategory;
  providerId: PropertyProviderId;
  schemaVersion?: number;
  categoryConfigVersion: number;
  invalidationVersion: number;
  providerFetchedAt: string;
  sourceCacheExpiresAt: string;
  browserTtlSeconds: number;
  responseContextValidUntil?: string | null;
  providerRetentionDeadline?: string | null;
  data: unknown;
  now?: Date;
};

export type BrowserCachePolicySnapshot = {
  browserCachingEnabled: boolean;
  globalConfigVersion: number;
  invalidationVersion: number;
  schemaVersion: number;
  categories: Record<
    PropertyDataCategory,
    {
      enabled: boolean;
      providerId: PropertyProviderId;
      browserTtlSeconds: number;
      categoryConfigVersion: number;
      browserCachingAllowed: boolean;
    }
  >;
};

export type PropertyIntelligenceBootstrap = {
  featureEnabled: boolean;
  browserCachingEnabled: boolean;
  responseContextId: ResponseContextId;
  propertyIdentityKey: string | null;
  propertyDisplayHint: string | null;
  schemaVersion: number;
  globalConfigVersion: number;
  invalidationVersion: number;
  etag: string;
  responseContextValidUntil: string | null;
  cachePolicy: BrowserCachePolicySnapshot;
  enabledCategories: PropertyDataCategory[];
};
