import type { Redis } from "@upstash/redis";
import {
  resolveRedisCacheEnvironment,
  requireUpstashRedisConfig,
} from "@/lib/property-intelligence/cache/provider/config";
import {
  getPropertyIntelligenceRedisClient,
  type PropertyIntelligenceRedisClient,
} from "@/lib/property-intelligence/cache/provider/client";
import {
  deserializePropertyCacheEntry,
  serializePropertyCacheEntry,
} from "@/lib/property-intelligence/cache/provider/entry-schema";
import {
  CacheProviderError,
  sanitizeCacheErrorMessage,
} from "@/lib/property-intelligence/cache/provider/errors";
import { remainingTtlSeconds } from "@/lib/property-intelligence/cache/provider/ttl";
import type {
  CacheGetResult,
  CachePingResult,
  CacheProvider,
  CacheSetInput,
  RedisCacheEnvironment,
} from "@/lib/property-intelligence/cache/provider/types";

export type UpstashRedisCacheProviderOptions = {
  id?: string;
  client?: PropertyIntelligenceRedisClient;
  environment?: RedisCacheEnvironment | string;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  operationTimeoutMs?: number;
  logger?: (message: string, meta?: Record<string, unknown>) => void;
};

export class UpstashRedisCacheProvider implements CacheProvider {
  readonly id: string;
  readonly kind = "redis" as const;
  readonly environment: RedisCacheEnvironment | string;

  private readonly client: Redis;
  private readonly now: () => Date;
  private readonly operationTimeoutMs: number;
  private readonly log: (
    message: string,
    meta?: Record<string, unknown>
  ) => void;

  constructor(options?: UpstashRedisCacheProviderOptions) {
    const env = options?.env ?? process.env;
    this.id = options?.id ?? "upstash-redis";
    this.environment =
      options?.environment ?? resolveRedisCacheEnvironment(env);
    this.client = options?.client ?? getPropertyIntelligenceRedisClient(env);
    this.now = options?.now ?? (() => new Date());
    this.operationTimeoutMs = options?.operationTimeoutMs ?? 5_000;
    this.log =
      options?.logger ??
      ((message, meta) => {
        console.warn(`[property-intelligence/redis] ${message}`, {
          ...meta,
          environment: this.environment,
        });
      });
  }

  async ping(): Promise<CachePingResult> {
    const started = Date.now();
    try {
      const result = await this.withTimeout(this.client.ping());
      if (result !== "PONG" && result !== "pong" && result !== "OK") {
        if (!result) {
          return {
            ok: false,
            error: new CacheProviderError({
              code: "unavailable",
              message: "Redis ping returned unexpected response",
              retryable: true,
            }),
          };
        }
      }
      return { ok: true, latencyMs: Math.max(0, Date.now() - started) };
    } catch (error) {
      return { ok: false, error: this.toUnavailable(error, "ping") };
    }
  }

  async get(key: string): Promise<CacheGetResult> {
    try {
      const raw = await this.withTimeout(this.client.get<unknown>(key));
      return this.decodeRaw(raw);
    } catch (error) {
      if (error instanceof CacheProviderError && error.code === "validation_failed") {
        return { status: "invalid", reason: error.message };
      }
      if (
        error instanceof CacheProviderError &&
        error.code === "serialization_failed"
      ) {
        return { status: "invalid", reason: error.message };
      }
      return { status: "unavailable", error: this.toUnavailable(error, "get") };
    }
  }

  async getMany(keys: string[]): Promise<Map<string, CacheGetResult>> {
    const out = new Map<string, CacheGetResult>();
    if (keys.length === 0) return out;

    try {
      const values = await this.withTimeout(
        this.client.mget<(string | Record<string, unknown> | null)[]>(...keys)
      );
      const list = Array.isArray(values) ? values : [];
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i]!;
        try {
          out.set(key, this.decodeRaw(list[i] ?? null));
        } catch (error) {
          out.set(key, {
            status: "invalid",
            reason:
              error instanceof Error
                ? sanitizeCacheErrorMessage(error.message)
                : "Invalid cached payload",
          });
        }
      }
      return out;
    } catch (error) {
      const unavailable = this.toUnavailable(error, "mget");
      for (const key of keys) {
        out.set(key, { status: "unavailable", error: unavailable });
      }
      return out;
    }
  }

  async set(input: CacheSetInput): Promise<void> {
    await this.setMany([input]);
  }

  async setMany(inputs: CacheSetInput[]): Promise<void> {
    if (inputs.length === 0) return;

    const prepared: Array<{ key: string; body: string; ttlSeconds: number }> =
      [];

    for (const input of inputs) {
      const ttlSeconds = Math.floor(input.ttlSeconds);
      if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1) {
        throw new CacheProviderError({
          code: "validation_failed",
          message: "ttlSeconds must be >= 1 — permanent payload keys are forbidden",
          retryable: false,
        });
      }
      const body = serializePropertyCacheEntry(input.entry);
      prepared.push({ key: input.key, body, ttlSeconds });
    }

    try {
      if (prepared.length === 1) {
        const only = prepared[0]!;
        await this.withTimeout(
          this.client.set(only.key, only.body, { ex: only.ttlSeconds })
        );
        return;
      }

      const pipe = this.client.pipeline();
      for (const item of prepared) {
        pipe.set(item.key, item.body, { ex: item.ttlSeconds });
      }
      await this.withTimeout(pipe.exec());
    } catch (error) {
      if (error instanceof CacheProviderError) throw error;
      throw this.toWriteError(error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const n = await this.withTimeout(this.client.del(key));
      return Number(n) > 0;
    } catch (error) {
      throw this.toUnavailable(error, "del");
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    try {
      const n = await this.withTimeout(this.client.del(...keys));
      return Number(n) || 0;
    } catch (error) {
      throw this.toUnavailable(error, "del");
    }
  }

  private decodeRaw(raw: unknown): CacheGetResult {
    if (raw == null) return { status: "miss" };

    let entry;
    try {
      entry = deserializePropertyCacheEntry(raw);
    } catch (error) {
      return {
        status: "invalid",
        reason:
          error instanceof Error
            ? sanitizeCacheErrorMessage(error.message)
            : "Invalid cached payload",
      };
    }

    const now = this.now();
    const expiresMs = Date.parse(entry.expiresAt);
    if (!Number.isFinite(expiresMs) || expiresMs <= now.getTime()) {
      return { status: "expired", entry };
    }

    return {
      status: "hit",
      entry,
      remainingTtlSeconds: remainingTtlSeconds(entry.expiresAt, now),
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            reject(
              new CacheProviderError({
                code: "timeout",
                message: `Redis operation timed out after ${this.operationTimeoutMs}ms`,
                retryable: true,
              })
            );
          }, this.operationTimeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private toUnavailable(error: unknown, op: string): CacheProviderError {
    if (error instanceof CacheProviderError) return error;
    const message =
      error instanceof Error ? error.message : "Redis operation failed";
    this.log(`redis_${op}_failed`, {
      code: "unavailable",
    });
    return new CacheProviderError({
      code: "unavailable",
      message: `Redis ${op} failed: ${sanitizeCacheErrorMessage(message)}`,
      retryable: true,
      cause: error,
    });
  }

  private toWriteError(error: unknown): CacheProviderError {
    if (error instanceof CacheProviderError) return error;
    const message =
      error instanceof Error ? error.message : "Redis write failed";
    this.log("redis_write_failed", { code: "write_failed" });
    return new CacheProviderError({
      code: "write_failed",
      message: sanitizeCacheErrorMessage(message),
      retryable: true,
      cause: error,
    });
  }
}

export function createUpstashRedisCacheProvider(
  options?: UpstashRedisCacheProviderOptions
): UpstashRedisCacheProvider {
  if (!options?.client) {
    requireUpstashRedisConfig(options?.env ?? process.env);
  }
  return new UpstashRedisCacheProvider(options);
}
