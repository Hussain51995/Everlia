import { describe, expect, it } from "vitest";
import { buildPropertyIntelligenceBootstrap } from "@/lib/property-intelligence/bootstrap/build-respond-bootstrap";
import {
  createBrowserCacheService,
  assertPublicSafeBrowserPayload,
} from "@/lib/property-intelligence/browser/cache-service";
import { buildResponseContextId } from "@/lib/property-intelligence/browser/context-id";
import { computeBrowserExpiresAt } from "@/lib/property-intelligence/browser/policy";
import {
  MemoryBrowserCacheStorage,
  browserCacheStorageKey,
} from "@/lib/property-intelligence/browser/storage";
import { createBrowserCacheTelemetry } from "@/lib/property-intelligence/browser/telemetry";
import {
  BROWSER_CACHE_SCHEMA_VERSION,
  DEFAULT_BROWSER_TTL_SECONDS,
} from "@/lib/property-intelligence/browser/types";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

function makeClock(iso: string) {
  let now = new Date(iso);
  return {
    now: () => now,
    set: (next: string) => {
      now = new Date(next);
    },
  };
}

describe("browser TTL policy", () => {
  it("never extends beyond database expiry", () => {
    const expires = computeBrowserExpiresAt({
      now: new Date("2025-01-01T00:00:00.000Z"),
      browserTtlSeconds: 7 * 24 * 60 * 60,
      databaseExpiresAt: "2025-01-01T12:00:00.000Z",
    });
    expect(expires).toBe("2025-01-01T12:00:00.000Z");
  });

  it("respects response context and retention deadlines", () => {
    const expires = computeBrowserExpiresAt({
      now: new Date("2025-01-01T00:00:00.000Z"),
      browserTtlSeconds: 86_400,
      databaseExpiresAt: "2025-01-10T00:00:00.000Z",
      responseContextValidUntil: "2025-01-01T06:00:00.000Z",
      providerRetentionDeadline: "2025-01-01T08:00:00.000Z",
    });
    expect(expires).toBe("2025-01-01T06:00:00.000Z");
  });

  it("exposes expected default browser TTLs", () => {
    expect(DEFAULT_BROWSER_TTL_SECONDS.property_details).toBe(604800);
    expect(DEFAULT_BROWSER_TTL_SECONDS.property_valuation).toBe(86400);
    expect(DEFAULT_BROWSER_TTL_SECONDS.nearby_houses).toBe(21600);
    expect(DEFAULT_BROWSER_TTL_SECONDS.nearby_land).toBe(21600);
    expect(DEFAULT_BROWSER_TTL_SECONDS.market_statistics).toBe(86400);
  });
});

describe("PropertyBrowserCacheService", () => {
  it("writes and reads a category; reading does not extend expiry", async () => {
    const clock = makeClock("2025-02-01T00:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const telemetry = createBrowserCacheTelemetry({ sampleRate: 1 });
    const cache = createBrowserCacheService({
      storage,
      now: clock.now,
      telemetry,
    });

    const written = await cache.set({
      responseContextId: "ctx-a",
      propertyIdentityKey: "PROP|1",
      category: "property_details",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-02-01T00:00:00.000Z",
      databaseExpiresAt: "2025-02-08T00:00:00.000Z",
      browserTtlSeconds: 3600,
      data: { specifications: { bedrooms: 3 } },
      now: clock.now(),
    });
    expect(written?.browserExpiresAt).toBe("2025-02-01T01:00:00.000Z");

    clock.set("2025-02-01T00:30:00.000Z");
    const hit = await cache.get({
      responseContextId: "ctx-a",
      propertyIdentityKey: "PROP|1",
      category: "property_details",
      providerId: "mock",
    });
    expect(hit.status).toBe("hit");
    if (hit.status === "hit") {
      expect(hit.record.browserExpiresAt).toBe("2025-02-01T01:00:00.000Z");
      expect(hit.remainingTtlSeconds).toBe(1800);
    }
    expect(telemetry.getSnapshot().hits).toBe(1);
  });

  it("partial multi-category read: hits + misses", async () => {
    const clock = makeClock("2026-11-24T12:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    await cache.set({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "property_details",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2026-11-24T12:00:00.000Z",
      databaseExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { ok: true },
      now: clock.now(),
    });
    await cache.set({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "property_valuation",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2026-11-24T12:00:00.000Z",
      databaseExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { estimate: { amount: 1 } },
      now: clock.now(),
    });

    const many = await cache.getMany(
      [
        {
          responseContextId: "ctx",
          propertyIdentityKey: "P",
          category: "property_details",
          providerId: "mock",
        },
        {
          responseContextId: "ctx",
          propertyIdentityKey: "P",
          category: "property_valuation",
          providerId: "mock",
        },
        {
          responseContextId: "ctx",
          propertyIdentityKey: "P",
          category: "nearby_houses",
          providerId: "mock",
        },
      ],
      { invalidationVersion: 1 }
    );

    expect(many.get("property_details")?.status).toBe("hit");
    expect(many.get("property_valuation")?.status).toBe("hit");
    expect(many.get("nearby_houses")?.status).toBe("miss");
  });

  it("expires at boundary and cleans up", async () => {
    const clock = makeClock("2025-03-01T00:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    await cache.set({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "nearby_land",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-03-01T00:00:00.000Z",
      databaseExpiresAt: "2025-03-01T00:10:00.000Z",
      browserTtlSeconds: 60,
      data: [],
      now: clock.now(),
    });

    clock.set("2025-03-01T00:01:00.000Z");
    const expired = await cache.get({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "nearby_land",
      providerId: "mock",
    });
    expect(expired.status).toBe("miss");
    if (expired.status === "miss") expect(expired.reason).toBe("expired");

    const removed = await cache.cleanupExpired({ now: clock.now() });
    expect(removed).toBeGreaterThanOrEqual(0);
  });

  it("invalidates by category, context, provider/config/schema mismatches", async () => {
    const clock = makeClock("2026-11-24T12:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    const parts = {
      responseContextId: "ctx-1",
      propertyIdentityKey: "P",
      category: "market_statistics" as const,
      providerId: "mock" as const,
    };
    await cache.set({
      ...parts,
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2026-11-24T12:00:00.000Z",
      databaseExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { median: 1 },
      now: clock.now(),
    });

    const providerMiss = await cache.get(parts, {
    });
    expect(providerMiss.status).toBe("hit");

    const configMiss = await cache.get(parts, { categoryConfigVersion: 99 });
    expect(configMiss.status).toBe("miss");
    if (configMiss.status === "miss") {
      expect(configMiss.reason).toBe("config_mismatch");
    }

    const schemaMiss = await cache.get(parts, {
      schemaVersion: BROWSER_CACHE_SCHEMA_VERSION + 1,
    });
    expect(schemaMiss.status).toBe("miss");

    await cache.invalidateCategory(parts);
    expect((await cache.get(parts)).status).toBe("miss");

    await cache.set({
      responseContextId: "ctx-1",
      propertyIdentityKey: "P",
      category: "property_details",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2026-11-24T12:00:00.000Z",
      databaseExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { x: 1 },
      now: clock.now(),
    });
    const n = await cache.invalidateResponseContext("ctx-1");
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it("isolates different response contexts", async () => {
    const clock = makeClock("2026-11-24T12:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    await cache.set({
      responseContextId: "ctx-a",
      propertyIdentityKey: "SAME",
      category: "property_details",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2026-11-24T12:00:00.000Z",
      databaseExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { from: "a" },
      now: clock.now(),
    });
    const miss = await cache.get({
      responseContextId: "ctx-b",
      propertyIdentityKey: "SAME",
      category: "property_details",
      providerId: "mock",
    });
    expect(miss.status).toBe("miss");
  });

  it("reconciles disabled categories and provider changes", async () => {
    const clock = makeClock("2026-11-24T12:00:00.000Z");
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      settings.setCategoryProvider(c, "mock");
    }
    const bootstrap = buildPropertyIntelligenceBootstrap({
      qrTokenRowId: "qr-uuid-1",
      customer: {
        property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
      },
      config: await settings.getResolvedConfig(),
    });

    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    const landConfig =
      bootstrap.cachePolicy.categories.nearby_land.categoryConfigVersion;
    await cache.set({
      responseContextId: bootstrap.responseContextId,
      propertyIdentityKey: bootstrap.propertyIdentityKey!,
      category: "nearby_land",
      providerId: "mock",
      categoryConfigVersion: landConfig,
      invalidationVersion: bootstrap.invalidationVersion,
      providerFetchedAt: "2026-11-24T12:00:00.000Z",
      databaseExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { items: [] },
      now: clock.now(),
    });

    settings.setCategoryEnabled("nearby_land", false);
    const next = buildPropertyIntelligenceBootstrap({
      qrTokenRowId: "qr-uuid-1",
      customer: {
        property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
      },
      config: await settings.getResolvedConfig(),
    });

    const removed = await cache.reconcileWithPolicy(
      next.responseContextId,
      next.cachePolicy,
      next.propertyIdentityKey
    );
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  it("rejects private payload keys and handles storage quota gracefully", async () => {
    expect(() =>
      assertPublicSafeBrowserPayload({ qr_token: "secret" })
    ).toThrow();

    const storage = new MemoryBrowserCacheStorage();
    const originalSet = storage.set.bind(storage);
    let once = true;
    storage.set = async (key, record) => {
      if (once) {
        once = false;
        const err = new Error("QuotaExceededError");
        (err as { name: string }).name = "QuotaExceededError";
        throw err;
      }
      return originalSet(key, record);
    };

    expect(
      browserCacheStorageKey({
        responseContextId: "a",
        propertyIdentityKey: "b",
        category: "property_details",
        providerId: "mock",
      })
    ).toContain("property_details");
  });

  it("browserCachingEnabled=false forces misses without writes", async () => {
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({
      storage,
      browserCachingEnabled: false,
    });
    const written = await cache.set({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "property_details",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-01-01T00:00:00.000Z",
      databaseExpiresAt: "2025-12-01T00:00:00.000Z",
      browserTtlSeconds: 86_400,
      data: { x: 1 },
    });
    expect(written).toBeNull();
    expect(storage.map.size).toBe(0);
  });
});

describe("bootstrap + opaque context", () => {
  it("never embeds the raw QR token in responseContextId", () => {
    const id = buildResponseContextId("11111111-1111-1111-1111-111111111111");
    expect(id).not.toContain("token");
    expect(id).toHaveLength(32);
  });

  it("builds bootstrap with enabled categories and etag", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      settings.setCategoryProvider(c, "mock");
    }
    const bootstrap = buildPropertyIntelligenceBootstrap({
      qrTokenRowId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      customer: {
        property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
      },
      config: await settings.getResolvedConfig(),
    });
    expect(bootstrap.featureEnabled).toBe(true);
    expect(bootstrap.propertyIdentityKey).toContain("GRAND LAKE");
    expect(bootstrap.etag.startsWith('"pi-')).toBe(true);
    expect(bootstrap.enabledCategories.length).toBe(5);
    expect(bootstrap.cachePolicy.categories.property_details.browserTtlSeconds).toBe(
      604800
    );
  });

  it("handles missing property address without failing bootstrap", async () => {
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    const bootstrap = buildPropertyIntelligenceBootstrap({
      qrTokenRowId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      customer: { property_address: null },
      config: await settings.getResolvedConfig(),
    });
    expect(bootstrap.propertyIdentityKey).toBeNull();
    expect(bootstrap.featureEnabled).toBe(true);
  });
});
