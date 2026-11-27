export type {
  CacheGetResult,
  CacheGetHit,
  CacheGetMiss,
  CacheGetExpired,
  CacheGetInvalid,
  CacheGetUnavailable,
  CacheSetInput,
  CachePingResult,
  CacheProvider,
  PropertyCacheEntry,
  RedisCacheEnvironment,
  BuildRedisStorageKeyInput,
} from "@/lib/property-intelligence/cache/provider/types";

export { PROPERTY_CACHE_ENTRY_ENVELOPE_VERSION } from "@/lib/property-intelligence/cache/provider/types";

export {
  CacheProviderError,
  isCacheUnavailableError,
  sanitizeCacheErrorMessage,
} from "@/lib/property-intelligence/cache/provider/errors";
export type { CacheProviderErrorCode } from "@/lib/property-intelligence/cache/provider/errors";

export {
  propertyCacheEntrySchema,
  parsePropertyCacheEntry,
  serializePropertyCacheEntry,
  deserializePropertyCacheEntry,
  createPropertyCacheEntry,
} from "@/lib/property-intelligence/cache/provider/entry-schema";

export {
  buildPropertyQueryHash,
  buildRedisStorageKey,
  redisStorageKeyFromBuiltCacheKey,
} from "@/lib/property-intelligence/cache/provider/redis-keys";

export {
  resolveRedisWriteTtl,
  remainingTtlSeconds,
  buildExpiresAtFromTtl,
} from "@/lib/property-intelligence/cache/provider/ttl";
export type {
  RedisWriteTtlInput,
  RedisWriteTtlResult,
} from "@/lib/property-intelligence/cache/provider/ttl";

export {
  resolveUpstashRedisConfig,
  requireUpstashRedisConfig,
  resolveRedisCacheEnvironment,
  isUpstashRedisConfigured,
} from "@/lib/property-intelligence/cache/provider/config";
export type {
  UpstashRedisConfig,
  ResolvedUpstashRedisConfig,
} from "@/lib/property-intelligence/cache/provider/config";

export {
  getPropertyIntelligenceRedisClient,
  createPropertyIntelligenceRedisClient,
  resetPropertyIntelligenceRedisClientForTests,
} from "@/lib/property-intelligence/cache/provider/client";

export {
  MemoryCacheProvider,
  createMemoryCacheProvider,
} from "@/lib/property-intelligence/cache/provider/memory-adapter";

export {
  UpstashRedisCacheProvider,
  createUpstashRedisCacheProvider,
} from "@/lib/property-intelligence/cache/provider/upstash-adapter";

export {
  createPropertyIntelligenceCacheProvider,
} from "@/lib/property-intelligence/cache/provider/factory";
export type { CreateCacheProviderOptions } from "@/lib/property-intelligence/cache/provider/factory";
