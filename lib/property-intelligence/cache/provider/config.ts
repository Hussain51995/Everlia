import type { RedisCacheEnvironment } from "@/lib/property-intelligence/cache/provider/types";
import { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";

export type UpstashRedisConfig = {
  url: string;
  token: string;
  environment: RedisCacheEnvironment;
  configured: true;
};

export type UpstashRedisConfigMissing = {
  configured: false;
  reason: string;
};

export type ResolvedUpstashRedisConfig =
  | UpstashRedisConfig
  | UpstashRedisConfigMissing;

export function resolveUpstashRedisConfig(
  env: NodeJS.ProcessEnv = process.env
): ResolvedUpstashRedisConfig {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";

  if (!url && !token) {
    return {
      configured: false,
      reason: "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are unset",
    };
  }
  if (!url || !token) {
    return {
      configured: false,
      reason:
        "Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required",
    };
  }
  if (!/^https:\/\//i.test(url)) {
    return {
      configured: false,
      reason: "UPSTASH_REDIS_REST_URL must be an https URL",
    };
  }
  if (url.toLowerCase().includes("localhost") || url.includes("127.0.0.1")) {
  }

  return {
    configured: true,
    url,
    token,
    environment: resolveRedisCacheEnvironment(env),
  };
}

export function requireUpstashRedisConfig(
  env: NodeJS.ProcessEnv = process.env
): UpstashRedisConfig {
  const resolved = resolveUpstashRedisConfig(env);
  if (!resolved.configured) {
    throw new CacheProviderError({
      code: "misconfigured",
      message: resolved.reason,
      retryable: false,
    });
  }
  return resolved;
}

export function resolveRedisCacheEnvironment(
  env: NodeJS.ProcessEnv = process.env
): RedisCacheEnvironment {
  const explicit = env.PROPERTY_INTELLIGENCE_CACHE_ENV?.trim().toLowerCase();
  if (
    explicit === "development" ||
    explicit === "preview" ||
    explicit === "production" ||
    explicit === "test"
  ) {
    return explicit;
  }

  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "development") return "development";

  if (env.NODE_ENV === "test") return "test";
  if (env.NODE_ENV === "production") return "production";
  return "development";
}

export function isUpstashRedisConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return resolveUpstashRedisConfig(env).configured;
}
