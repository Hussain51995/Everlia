import {
  deserializePropertyCacheEntry,
  serializePropertyCacheEntry,
} from "@/lib/property-intelligence/cache/provider/entry-schema";
import { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";
import type {
  CacheGetResult,
  CachePingResult,
  CacheProvider,
  CacheSetInput,
} from "@/lib/property-intelligence/cache/provider/types";

type MemoryRow = {
  serialized: string;
  expiresAtMs: number;
};

export type MemoryCacheProviderOptions = {
  id?: string;
  now?: () => Date;
  simulateUnavailable?: boolean;
};

export class MemoryCacheProvider implements CacheProvider {
  readonly id: string;
  readonly kind = "memory" as const;

  private readonly store = new Map<string, MemoryRow>();
  private readonly now: () => Date;

  simulateUnavailable: boolean;
  failNextReads = 0;
  failNextWrites = 0;
  failSerializationOnWrite = false;

  constructor(options?: MemoryCacheProviderOptions) {
    this.id = options?.id ?? "memory";
    this.now = options?.now ?? (() => new Date());
    this.simulateUnavailable = options?.simulateUnavailable ?? false;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    this.purgeExpired();
    return this.store.size;
  }

  async ping(): Promise<CachePingResult> {
    const started = Date.now();
    if (this.simulateUnavailable) {
      return {
        ok: false,
        error: new CacheProviderError({
          code: "unavailable",
          message: "Simulated memory cache unavailable",
          retryable: true,
        }),
      };
    }
    return { ok: true, latencyMs: Math.max(0, Date.now() - started) };
  }

  async get(key: string): Promise<CacheGetResult> {
    if (this.simulateUnavailable || this.failNextReads > 0) {
      if (this.failNextReads > 0) this.failNextReads -= 1;
      return {
        status: "unavailable",
        error: new CacheProviderError({
          code: "unavailable",
          message: "Simulated memory cache read failure",
          retryable: true,
        }),
      };
    }

    const row = this.store.get(key);
    if (!row) return { status: "miss" };

    const nowMs = this.now().getTime();
    if (row.expiresAtMs <= nowMs) {
      this.store.delete(key);
      try {
        const entry = deserializePropertyCacheEntry(row.serialized);
        return { status: "expired", entry };
      } catch {
        return { status: "miss" };
      }
    }

    return this.decodeHit(row.serialized, nowMs, row.expiresAtMs);
  }

  async getMany(keys: string[]): Promise<Map<string, CacheGetResult>> {
    const out = new Map<string, CacheGetResult>();
    if (keys.length === 0) return out;

    if (this.simulateUnavailable || this.failNextReads > 0) {
      if (this.failNextReads > 0) this.failNextReads -= 1;
      const error = new CacheProviderError({
        code: "unavailable",
        message: "Simulated memory cache read failure",
        retryable: true,
      });
      for (const key of keys) {
        out.set(key, { status: "unavailable", error });
      }
      return out;
    }

    for (const key of keys) {
      out.set(key, await this.get(key));
    }
    return out;
  }

  async set(input: CacheSetInput): Promise<void> {
    await this.setMany([input]);
  }

  async setMany(inputs: CacheSetInput[]): Promise<void> {
    if (inputs.length === 0) return;

    if (this.simulateUnavailable || this.failNextWrites > 0) {
      if (this.failNextWrites > 0) this.failNextWrites -= 1;
      throw new CacheProviderError({
        code: "write_failed",
        message: "Simulated memory cache write failure",
        retryable: true,
      });
    }

    const now = this.now();
    for (const input of inputs) {
      const ttlSeconds = Math.floor(input.ttlSeconds);
      if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1) {
        throw new CacheProviderError({
          code: "validation_failed",
          message: "ttlSeconds must be >= 1",
          retryable: false,
        });
      }

      if (this.failSerializationOnWrite) {
        throw new CacheProviderError({
          code: "serialization_failed",
          message: "Simulated serialization failure",
          retryable: false,
        });
      }

      const serialized = serializePropertyCacheEntry(input.entry);
      this.store.set(input.key, {
        serialized,
        expiresAtMs: now.getTime() + ttlSeconds * 1000,
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    if (this.simulateUnavailable) {
      throw new CacheProviderError({
        code: "unavailable",
        message: "Simulated memory cache unavailable",
        retryable: true,
      });
    }
    return this.store.delete(key);
  }

  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    if (this.simulateUnavailable) {
      throw new CacheProviderError({
        code: "unavailable",
        message: "Simulated memory cache unavailable",
        retryable: true,
      });
    }
    let n = 0;
    for (const key of keys) {
      if (this.store.delete(key)) n += 1;
    }
    return n;
  }

  expireKeyNow(key: string): void {
    const row = this.store.get(key);
    if (!row) return;
    this.store.set(key, { ...row, expiresAtMs: this.now().getTime() - 1 });
  }

  private decodeHit(
    serialized: string,
    nowMs: number,
    nativeExpiresAtMs?: number
  ): CacheGetResult {
    try {
      const entry = deserializePropertyCacheEntry(serialized);
      const entryExpiresMs = Date.parse(entry.expiresAt);
      const effectiveExpiresMs = Math.min(
        Number.isFinite(entryExpiresMs) ? entryExpiresMs : Number.POSITIVE_INFINITY,
        nativeExpiresAtMs ?? Number.POSITIVE_INFINITY
      );
      if (!Number.isFinite(effectiveExpiresMs) || effectiveExpiresMs <= nowMs) {
        return { status: "expired", entry };
      }
      return {
        status: "hit",
        entry,
        remainingTtlSeconds: Math.max(
          0,
          Math.floor((effectiveExpiresMs - nowMs) / 1000)
        ),
      };
    } catch (error) {
      return {
        status: "invalid",
        reason:
          error instanceof Error ? error.message : "Invalid cached payload",
      };
    }
  }

  private purgeExpired(): void {
    const nowMs = this.now().getTime();
    for (const [key, row] of this.store) {
      if (row.expiresAtMs <= nowMs) this.store.delete(key);
    }
  }
}

export function createMemoryCacheProvider(
  options?: MemoryCacheProviderOptions
): MemoryCacheProvider {
  return new MemoryCacheProvider(options);
}

export type InMemoryCacheProvider = MemoryCacheProvider;
