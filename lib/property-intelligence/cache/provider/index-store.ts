import { createHash } from "crypto";
import type { Redis } from "@upstash/redis";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";

export interface PropertyCacheIndexStore {
  track(input: {
    storageKey: string;
    providerId: string;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    environment: string;
  }): Promise<void>;
  listByIdentity(
    environment: string,
    normalizedIdentityKey: string
  ): Promise<string[]>;
  listByIdentityPrefix(
    environment: string,
    prefix: string
  ): Promise<string[]>;
  listByProvider(environment: string, providerId: string): Promise<string[]>;
  listByCategory(
    environment: string,
    category: PropertyDataCategory
  ): Promise<string[]>;
  listAll(environment: string, limit?: number): Promise<string[]>;
  listRecent(environment: string, limit?: number): Promise<string[]>;
  untrackKeys(environment: string, keys: string[]): Promise<void>;
}

function tagKey(environment: string, kind: string, value: string): string {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 40);
  return `everlia:property:${environment}:idx:${kind}:${hash}`;
}

function allTag(environment: string): string {
  return `everlia:property:${environment}:idx:all`;
}

function recentKey(environment: string): string {
  return `everlia:property:${environment}:idx:recent`;
}

function identityPrefixTag(environment: string, prefix: string): string {
  return tagKey(environment, "idprefix", prefix);
}

export class MemoryPropertyCacheIndexStore implements PropertyCacheIndexStore {
  private readonly sets = new Map<string, Set<string>>();
  private readonly recent: Array<{ key: string; score: number }> = [];

  async track(input: {
    storageKey: string;
    providerId: string;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    environment: string;
  }): Promise<void> {
    const env = input.environment;
    this.add(tagKey(env, "identity", input.normalizedIdentityKey), input.storageKey);
    this.add(tagKey(env, "provider", input.providerId), input.storageKey);
    this.add(tagKey(env, "category", input.category), input.storageKey);
    this.add(allTag(env), input.storageKey);
    if (input.normalizedIdentityKey.startsWith("market:")) {
      this.add(
        identityPrefixTag(env, input.normalizedIdentityKey),
        input.storageKey
      );
      const parts = input.normalizedIdentityKey.split(":");
      if (parts.length >= 3) {
        this.add(
          identityPrefixTag(env, `${parts[0]}:${parts[1]}:${parts[2]}`),
          input.storageKey
        );
      }
    }
    this.recent.push({ key: input.storageKey, score: Date.now() });
    if (this.recent.length > 500) this.recent.splice(0, this.recent.length - 500);
  }

  async listByIdentity(environment: string, normalizedIdentityKey: string) {
    return [...(this.sets.get(tagKey(environment, "identity", normalizedIdentityKey)) ?? [])];
  }

  async listByIdentityPrefix(environment: string, prefix: string) {
    return [...(this.sets.get(identityPrefixTag(environment, prefix)) ?? [])];
  }

  async listByProvider(environment: string, providerId: string) {
    return [...(this.sets.get(tagKey(environment, "provider", providerId)) ?? [])];
  }

  async listByCategory(environment: string, category: PropertyDataCategory) {
    return [...(this.sets.get(tagKey(environment, "category", category)) ?? [])];
  }

  async listAll(environment: string, limit = 200) {
    return [...(this.sets.get(allTag(environment)) ?? [])].slice(0, limit);
  }

  async listRecent(environment: string, limit = 50) {
    void environment;
    return this.recent
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.key);
  }

  async untrackKeys(environment: string, keys: string[]): Promise<void> {
    const drop = new Set(keys);
    for (const [tag, set] of this.sets) {
      if (!tag.includes(`:${environment}:`)) continue;
      for (const k of keys) set.delete(k);
      if (set.size === 0) this.sets.delete(tag);
    }
    for (let i = this.recent.length - 1; i >= 0; i -= 1) {
      if (drop.has(this.recent[i]!.key)) this.recent.splice(i, 1);
    }
  }

  private add(tag: string, key: string) {
    const set = this.sets.get(tag) ?? new Set<string>();
    set.add(key);
    this.sets.set(tag, set);
  }
}

export class RedisPropertyCacheIndexStore implements PropertyCacheIndexStore {
  constructor(private readonly client: Redis) {}

  async track(input: {
    storageKey: string;
    providerId: string;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    environment: string;
  }): Promise<void> {
    try {
      const env = input.environment;
      const pipe = this.client.pipeline();
      pipe.sadd(tagKey(env, "identity", input.normalizedIdentityKey), input.storageKey);
      pipe.sadd(tagKey(env, "provider", input.providerId), input.storageKey);
      pipe.sadd(tagKey(env, "category", input.category), input.storageKey);
      pipe.sadd(allTag(env), input.storageKey);
      if (input.normalizedIdentityKey.startsWith("market:")) {
        pipe.sadd(
          identityPrefixTag(env, input.normalizedIdentityKey),
          input.storageKey
        );
        const parts = input.normalizedIdentityKey.split(":");
        if (parts.length >= 3) {
          pipe.sadd(
            identityPrefixTag(env, `${parts[0]}:${parts[1]}:${parts[2]}`),
            input.storageKey
          );
        }
      }
      pipe.zadd(recentKey(env), {
        score: Date.now(),
        member: input.storageKey,
      });
      await pipe.exec();
    } catch (error) {
      throw new CacheProviderError({
        code: "write_failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update Redis cache indexes",
        retryable: true,
        cause: error,
      });
    }
  }

  async listByIdentity(environment: string, normalizedIdentityKey: string) {
    return this.smembers(tagKey(environment, "identity", normalizedIdentityKey));
  }

  async listByIdentityPrefix(environment: string, prefix: string) {
    return this.smembers(identityPrefixTag(environment, prefix));
  }

  async listByProvider(environment: string, providerId: string) {
    return this.smembers(tagKey(environment, "provider", providerId));
  }

  async listByCategory(environment: string, category: PropertyDataCategory) {
    return this.smembers(tagKey(environment, "category", category));
  }

  async listAll(environment: string, limit = 200) {
    const all = await this.smembers(allTag(environment));
    return all.slice(0, limit);
  }

  async listRecent(environment: string, limit = 50) {
    try {
      const members = await this.client.zrange(recentKey(environment), 0, limit - 1, {
        rev: true,
      });
      return (members as string[]) ?? [];
    } catch {
      return [];
    }
  }

  async untrackKeys(environment: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const pipe = this.client.pipeline();
      for (const key of keys) {
        pipe.zrem(recentKey(environment), key);
      }
      pipe.srem(allTag(environment), ...keys);
      await pipe.exec();
    } catch {
    }
  }

  private async smembers(tag: string): Promise<string[]> {
    try {
      const members = await this.client.smembers(tag);
      return (members as string[]) ?? [];
    } catch (error) {
      throw new CacheProviderError({
        code: "unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Failed to read Redis cache indexes",
        retryable: true,
        cause: error,
      });
    }
  }
}
