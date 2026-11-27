import { isUpstashRedisConfigured } from "@/lib/property-intelligence/cache/provider/config";
import { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";
import { createMemoryCacheProvider } from "@/lib/property-intelligence/cache/provider/memory-adapter";
import type { CacheProvider } from "@/lib/property-intelligence/cache/provider/types";
import { createUpstashRedisCacheProvider } from "@/lib/property-intelligence/cache/provider/upstash-adapter";

export type CreateCacheProviderOptions = {
  backend?: "redis" | "memory";
  allowMemory?: boolean;
  env?: NodeJS.ProcessEnv;
};

export function createPropertyIntelligenceCacheProvider(
  options?: CreateCacheProviderOptions
): CacheProvider {
  const env = options?.env ?? process.env;
  const backend = options?.backend ?? "redis";

  if (backend === "memory") {
    if (!options?.allowMemory) {
      throw new CacheProviderError({
        code: "misconfigured",
        message:
          "Memory CacheProvider requires allowMemory: true (tests only; not a production fallback)",
        retryable: false,
      });
    }
    return createMemoryCacheProvider();
  }

  if (!isUpstashRedisConfigured(env)) {
    throw new CacheProviderError({
      code: "misconfigured",
      message:
        "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (server-only).",
      retryable: false,
    });
  }

  return createUpstashRedisCacheProvider({ env });
}
