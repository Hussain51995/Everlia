import { Redis } from "@upstash/redis";
import {
  requireUpstashRedisConfig,
  type UpstashRedisConfig,
} from "@/lib/property-intelligence/cache/provider/config";
import { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";

export type PropertyIntelligenceRedisClient = Redis;

let sharedClient: Redis | null = null;
let sharedConfigKey: string | null = null;

function configFingerprint(config: UpstashRedisConfig): string {
  return `${config.url}::${config.environment}::${config.token.slice(0, 8)}`;
}

export function getPropertyIntelligenceRedisClient(
  env: NodeJS.ProcessEnv = process.env
): Redis {
  const config = requireUpstashRedisConfig(env);
  const fingerprint = configFingerprint(config);
  if (sharedClient && sharedConfigKey === fingerprint) {
    return sharedClient;
  }

  sharedClient = createPropertyIntelligenceRedisClient(config);
  sharedConfigKey = fingerprint;
  return sharedClient;
}

export function createPropertyIntelligenceRedisClient(
  config: UpstashRedisConfig
): Redis {
  try {
    return new Redis({
      url: config.url,
      token: config.token,
      retry: {
        retries: 1,
        backoff: (retryCount) => Math.min(200 * retryCount, 500),
      },
    });
  } catch (error) {
    throw new CacheProviderError({
      code: "misconfigured",
      message:
        error instanceof Error
          ? error.message
          : "Failed to initialize Upstash Redis client",
      retryable: false,
      cause: error,
    });
  }
}

export function resetPropertyIntelligenceRedisClientForTests(): void {
  sharedClient = null;
  sharedConfigKey = null;
}
