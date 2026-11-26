import { describe, expect, it, vi } from "vitest";
import { buildCacheKey } from "@/lib/property-intelligence/cache/keys";
import {
  createMemoryCacheProvider,
  createPropertyCacheEntry,
  createPropertyIntelligenceCacheProvider,
  createUpstashRedisCacheProvider,
  buildPropertyQueryHash,
  buildRedisStorageKey,
  redisStorageKeyFromBuiltCacheKey,
  resolveRedisWriteTtl,
  resolveUpstashRedisConfig,
  serializePropertyCacheEntry,
  CacheProviderError,
} from "@/lib/property-intelligence/cache/provider";

function sampleEntry(overrides?: Partial<Parameters<typeof createPropertyCacheEntry>[0]>) {
  const fetchedAt = "2026-11-25T12:00:00.000Z";
  const expiresAt = "2026-11-28T12:00:00.000Z";
  return createPropertyCacheEntry({
    providerId: "rentcast",
    providerDataset: null,
    category: "property_details",
    schemaVersion: 1,
    normalizedIdentityKey: "us|123 main st|apt 2|austin|tx|78701",
    requestParamsFingerprint: "abc123",
    accessScope: "public_qr",
    fetchedAt,
    sourceDataAt: "2026-11-24T00:00:00.000Z",
    expiresAt,
    invalidationGeneration: 3,
    payload: { bedrooms: 3, bathrooms: 2 },
    ...overrides,
  });
}

describe("CacheProvider — Redis key utilities", () => {
  it("builds environment-namespaced keys without raw street text", () => {
    const queryHash = buildPropertyQueryHash({
      normalizedIdentityKey: "us|123 main st|apt 2|austin|tx|78701",
      requestParamsFingerprint: "fp1",
      providerDataset: null,
      invalidationGeneration: 1,
    });
    const key = buildRedisStorageKey({
      environment: "development",
      schemaVersion: 1,
      providerId: "rentcast",
      accessScope: "public_qr",
      category: "property_details",
      queryHash,
    });
    expect(key.startsWith("everlia:property:development:1:rentcast:public_qr:property_details:")).toBe(
      true
    );
    expect(key.toLowerCase()).not.toContain("main");
    expect(key).not.toContain("78701");
  });

  it("separates providers, scopes, environments, and invalidation generations", () => {
    const built = buildCacheKey({
      providerId: "rentcast",
      category: "property_valuation",
      normalizedIdentityKey: "us|1 oak|unit 4|dallas|tx|75201",
      requestParams: { compCount: 5 },
    });

    const a = redisStorageKeyFromBuiltCacheKey({
      key: built,
      providerId: "rentcast",
      category: "property_valuation",
      environment: "production",
      invalidationGeneration: 1,
    });
    const b = redisStorageKeyFromBuiltCacheKey({
      key: built,
      providerId: "zillow",
      category: "property_valuation",
      environment: "production",
      invalidationGeneration: 1,
    });
    const c = redisStorageKeyFromBuiltCacheKey({
      key: built,
      providerId: "rentcast",
      category: "property_valuation",
      environment: "preview",
      invalidationGeneration: 1,
    });
    const d = redisStorageKeyFromBuiltCacheKey({
      key: built,
      providerId: "rentcast",
      category: "property_valuation",
      environment: "production",
      invalidationGeneration: 2,
    });
    const e = redisStorageKeyFromBuiltCacheKey({
      key: { ...built, accessScope: "authenticated_only" },
      providerId: "rentcast",
      category: "property_valuation",
      environment: "production",
      invalidationGeneration: 1,
    });

    expect(new Set([a, b, c, d, e]).size).toBe(5);
  });
});

describe("CacheProvider — entry schema & TTL", () => {
  it("rejects private payload keys", () => {
    expect(() =>
      createPropertyCacheEntry({
        ...sampleEntry(),
        payload: { customer_id: "x", bedrooms: 1 } as never,
      })
    ).toThrow(/private key/i);
  });

  it("computes independent write TTLs and never permanent keys", () => {
    const short = resolveRedisWriteTtl({
      configuredTtlSeconds: 3 * 24 * 60 * 60,
      fetchedAt: "2026-11-25T00:00:00.000Z",
      now: new Date("2026-11-25T00:00:00.000Z"),
    });
    const long = resolveRedisWriteTtl({
      configuredTtlSeconds: 90 * 24 * 60 * 60,
      fetchedAt: "2026-11-25T00:00:00.000Z",
      now: new Date("2026-11-25T00:00:00.000Z"),
    });
    expect(short.ttlSeconds).toBe(3 * 24 * 60 * 60);
    expect(long.ttlSeconds).toBe(90 * 24 * 60 * 60);
    expect(short.ttlSeconds).toBeGreaterThanOrEqual(1);
    expect(long.ttlSeconds).toBeGreaterThanOrEqual(1);

    const capped = resolveRedisWriteTtl({
      configuredTtlSeconds: 3 * 24 * 60 * 60,
      maxProviderTtlSeconds: 24 * 60 * 60,
      fetchedAt: "2026-11-25T00:00:00.000Z",
      now: new Date("2026-11-25T00:00:00.000Z"),
    });
    expect(capped.ttlSeconds).toBe(24 * 60 * 60);
  });

  it("fails serialization for unsafe payloads", () => {
    expect(() =>
      serializePropertyCacheEntry({
        ...sampleEntry(),
        payload: { api_key: "secret" } as never,
      })
    ).toThrow(CacheProviderError);
  });
});

describe("CacheProvider — memory adapter", () => {
  it("supports hit, miss, independent TTLs, and batched retrieval", async () => {
    let now = new Date("2026-11-25T12:00:00.000Z");
    const cache = createMemoryCacheProvider({ now: () => now });

    const details = sampleEntry({
      category: "property_details",
      fetchedAt: "2026-11-25T12:00:00.000Z",
      expiresAt: "2026-11-25T12:01:40.000Z",
    });
    const valuation = sampleEntry({
      category: "property_valuation",
      payload: { estimate: 400000 },
      fetchedAt: "2026-11-25T12:00:00.000Z",
      expiresAt: "2026-11-25T12:00:10.000Z",
    });

    await cache.setMany([
      { key: "k-details", entry: details, ttlSeconds: 100 },
      { key: "k-valuation", entry: valuation, ttlSeconds: 10 },
    ]);

    const many = await cache.getMany(["k-details", "k-valuation", "k-missing"]);
    expect(many.get("k-details")?.status).toBe("hit");
    expect(many.get("k-valuation")?.status).toBe("hit");
    expect(many.get("k-missing")?.status).toBe("miss");

    now = new Date("2026-11-25T12:00:15.000Z");
    const after = await cache.getMany(["k-details", "k-valuation"]);
    expect(after.get("k-details")?.status).toBe("hit");
    expect(after.get("k-valuation")?.status).toBe("expired");

    const hit = await cache.get("k-details");
    expect(hit.status).toBe("hit");
    if (hit.status === "hit") {
      expect(hit.remainingTtlSeconds).toBeLessThan(100);
    }
  });

  it("distinguishes unavailable from miss", async () => {
    const cache = createMemoryCacheProvider();
    cache.simulateUnavailable = true;
    const result = await cache.get("any");
    expect(result.status).toBe("unavailable");
    expect(result.status === "unavailable" && result.error.code).toBe(
      "unavailable"
    );

    const ping = await cache.ping();
    expect(ping.ok).toBe(false);
  });

  it("surfaces write failures and invalid payloads", async () => {
    const cache = createMemoryCacheProvider();
    cache.failNextWrites = 1;
    await expect(
      cache.set({ key: "k", entry: sampleEntry(), ttlSeconds: 60 })
    ).rejects.toBeInstanceOf(CacheProviderError);

    cache.failSerializationOnWrite = true;
    await expect(
      cache.set({ key: "k2", entry: sampleEntry(), ttlSeconds: 60 })
    ).rejects.toMatchObject({ code: "serialization_failed" });
  });

  it("deletes keys", async () => {
    const cache = createMemoryCacheProvider();
    await cache.set({ key: "a", entry: sampleEntry(), ttlSeconds: 30 });
    expect(await cache.delete("a")).toBe(true);
    expect((await cache.get("a")).status).toBe("miss");
    expect(await cache.deleteMany(["a", "b"])).toBe(0);
  });
});

describe("CacheProvider — Upstash adapter (mocked Redis)", () => {
  function mockRedis(store: Map<string, { body: string; ex?: number }>) {
    return {
      ping: vi.fn(async () => "PONG"),
      get: vi.fn(async (key: string) => store.get(key)?.body ?? null),
      mget: vi.fn(async (...keys: string[]) =>
        keys.map((k) => store.get(k)?.body ?? null)
      ),
      set: vi.fn(async (key: string, body: string, opts?: { ex?: number }) => {
        store.set(key, { body, ex: opts?.ex });
        return "OK";
      }),
      del: vi.fn(async (...keys: string[]) => {
        let n = 0;
        for (const k of keys) {
          if (store.delete(k)) n += 1;
        }
        return n;
      }),
      pipeline: vi.fn(() => {
        const ops: Array<{ key: string; body: string; ex: number }> = [];
        return {
          set(key: string, body: string, opts?: { ex?: number }) {
            ops.push({ key, body, ex: opts?.ex ?? 1 });
            return this;
          },
          async exec() {
            for (const op of ops) {
              store.set(op.key, { body: op.body, ex: op.ex });
            }
            return ops.map(() => "OK");
          },
        };
      }),
    };
  }

  it("reads/writes with native TTL and batched mget", async () => {
    const store = new Map<string, { body: string; ex?: number }>();
    const client = mockRedis(store);
    const cache = createUpstashRedisCacheProvider({
      client: client as never,
      environment: "test",
      now: () => new Date("2026-11-25T12:00:00.000Z"),
    });

    const entryA = sampleEntry({ category: "nearby_houses" });
    const entryB = sampleEntry({
      category: "nearby_land",
      payload: { listings: [] },
    });

    await cache.setMany([
      { key: "rk:a", entry: entryA, ttlSeconds: 259200 },
      { key: "rk:b", entry: entryB, ttlSeconds: 604800 },
    ]);

    expect(client.pipeline).toHaveBeenCalled();
    expect(store.get("rk:a")?.ex).toBe(259200);
    expect(store.get("rk:b")?.ex).toBe(604800);

    const many = await cache.getMany(["rk:a", "rk:b", "rk:missing"]);
    expect(client.mget).toHaveBeenCalled();
    expect(many.get("rk:a")?.status).toBe("hit");
    expect(many.get("rk:b")?.status).toBe("hit");
    expect(many.get("rk:missing")?.status).toBe("miss");

    const ping = await cache.ping();
    expect(ping.ok).toBe(true);
  });

  it("treats connection failures as unavailable, not miss", async () => {
    const client = {
      ping: vi.fn(async () => {
        throw new Error("network down");
      }),
      get: vi.fn(async () => {
        throw new Error("network down");
      }),
      mget: vi.fn(async () => {
        throw new Error("network down");
      }),
      set: vi.fn(async () => {
        throw new Error("network down");
      }),
      del: vi.fn(async () => {
        throw new Error("network down");
      }),
      pipeline: vi.fn(),
    };
    const cache = createUpstashRedisCacheProvider({
      client: client as never,
      logger: () => undefined,
    });

    const get = await cache.get("k");
    expect(get.status).toBe("unavailable");

    const many = await cache.getMany(["a", "b"]);
    expect(many.get("a")?.status).toBe("unavailable");
    expect(many.get("b")?.status).toBe("unavailable");

    await expect(
      cache.set({ key: "k", entry: sampleEntry(), ttlSeconds: 60 })
    ).rejects.toMatchObject({ code: "write_failed" });

    const ping = await cache.ping();
    expect(ping.ok).toBe(false);
  });

  it("marks invalid cached JSON as invalid", async () => {
    const store = new Map<string, { body: string; ex?: number }>();
    store.set("bad", { body: "{not-json", ex: 60 });
    const cache = createUpstashRedisCacheProvider({
      client: mockRedis(store) as never,
      logger: () => undefined,
    });
    const result = await cache.get("bad");
    expect(result.status).toBe("invalid");
  });

  it("rejects permanent (ttl < 1) writes", async () => {
    const cache = createUpstashRedisCacheProvider({
      client: mockRedis(new Map()) as never,
      logger: () => undefined,
    });
    await expect(
      cache.set({ key: "k", entry: sampleEntry(), ttlSeconds: 0 })
    ).rejects.toMatchObject({ code: "validation_failed" });
  });
});

describe("CacheProvider — env / factory", () => {
  it("resolves Upstash config without NEXT_PUBLIC vars", () => {
    const missing = resolveUpstashRedisConfig({});
    expect(missing.configured).toBe(false);

    const ok = resolveUpstashRedisConfig({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
      VERCEL_ENV: "preview",
    });
    expect(ok.configured).toBe(true);
    if (ok.configured) {
      expect(ok.environment).toBe("preview");
      expect(ok.url).toContain("https://");
    }
  });

  it("refuses silent memory fallback for redis backend", () => {
    expect(() =>
      createPropertyIntelligenceCacheProvider({
        backend: "redis",
        env: {},
      })
    ).toThrow(/not configured/i);

    expect(() =>
      createPropertyIntelligenceCacheProvider({ backend: "memory" })
    ).toThrow(/allowMemory/i);

    const mem = createPropertyIntelligenceCacheProvider({
      backend: "memory",
      allowMemory: true,
    });
    expect(mem.kind).toBe("memory");
  });
});
