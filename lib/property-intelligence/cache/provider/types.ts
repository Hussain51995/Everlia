import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import type { CachePayload } from "@/lib/property-intelligence/cache/types";
import type { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";

export const PROPERTY_CACHE_ENTRY_ENVELOPE_VERSION = 1;

export type PropertyCacheEntry = {
  envelopeVersion: number;
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
  invalidationGeneration: number;
  payload: CachePayload;
};

export type CacheGetHit = {
  status: "hit";
  entry: PropertyCacheEntry;
  remainingTtlSeconds: number;
};

export type CacheGetMiss = {
  status: "miss";
};

export type CacheGetExpired = {
  status: "expired";
  entry: PropertyCacheEntry;
};

export type CacheGetInvalid = {
  status: "invalid";
  reason: string;
};

export type CacheGetUnavailable = {
  status: "unavailable";
  error: CacheProviderError;
};

export type CacheGetResult =
  | CacheGetHit
  | CacheGetMiss
  | CacheGetExpired
  | CacheGetInvalid
  | CacheGetUnavailable;

export type CacheSetInput = {
  key: string;
  entry: PropertyCacheEntry;
  ttlSeconds: number;
};

export type CachePingResult =
  | { ok: true; latencyMs: number }
  | { ok: false; error: CacheProviderError };

export interface CacheProvider {
  readonly id: string;
  readonly kind: "redis" | "memory" | "other";

  get(key: string): Promise<CacheGetResult>;
  getMany(keys: string[]): Promise<Map<string, CacheGetResult>>;

  set(input: CacheSetInput): Promise<void>;
  setMany(inputs: CacheSetInput[]): Promise<void>;

  delete(key: string): Promise<boolean>;
  deleteMany(keys: string[]): Promise<number>;

  ping(): Promise<CachePingResult>;
}

export type RedisCacheEnvironment = "development" | "preview" | "production" | "test";

export type BuildRedisStorageKeyInput = {
  environment: RedisCacheEnvironment | string;
  schemaVersion: number;
  providerId: string;
  providerDataset?: string | null;
  accessScope: string;
  category: PropertyDataCategory;
  queryHash: string;
  invalidationGeneration?: number;
};
