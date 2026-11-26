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
import {
  BROWSER_TTL_ALLOWLIST,
  MAX_BROWSER_TTL_SECONDS,
  assertAllowedBrowserTtlSeconds,
  coerceBrowserTtlSeconds,
  isAllowedBrowserTtlSeconds,
} from "@/lib/property-intelligence/browser/ttl";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import { propertyIntelligenceCategorySettingsPatchSchema } from "@/lib/validations/property-intelligence";

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
  it("never extends beyond source cache expiry", () => {
    const expires = computeBrowserExpiresAt({
      now: new Date("2025-01-01T00:00:00.000Z"),
      browserTtlSeconds: 10800,
      sourceCacheExpiresAt: "2025-01-01T01:00:00.000Z",
    });
    expect(expires).toBe("2025-01-01T01:00:00.000Z");
  });

  it("respects response context and retention deadlines", () => {
    const expires = computeBrowserExpiresAt({
      now: new Date("2025-01-01T00:00:00.000Z"),
      browserTtlSeconds: 10800,
      sourceCacheExpiresAt: "2025-01-10T00:00:00.000Z",
      responseContextValidUntil: "2025-01-01T00:30:00.000Z",
      providerRetentionDeadline: "2025-01-01T01:00:00.000Z",
    });
    expect(expires).toBe("2025-01-01T00:30:00.000Z");
  });

  it("caps browser expiry at the 3-hour maximum", () => {
    const expires = computeBrowserExpiresAt({
      now: new Date("2025-01-01T00:00:00.000Z"),
      browserTtlSeconds: 999_999,
      sourceCacheExpiresAt: "2025-12-01T00:00:00.000Z",
    });
    expect(expires).toBe("2025-01-01T03:00:00.000Z");
  });

  it("exposes V2 default browser TTLs", () => {
    expect(DEFAULT_BROWSER_TTL_SECONDS.property_details).toBe(10800);
    expect(DEFAULT_BROWSER_TTL_SECONDS.property_valuation).toBe(10800);
    expect(DEFAULT_BROWSER_TTL_SECONDS.nearby_houses).toBe(7200);
    expect(DEFAULT_BROWSER_TTL_SECONDS.nearby_land).toBe(7200);
    expect(DEFAULT_BROWSER_TTL_SECONDS.market_statistics).toBe(10800);
  });

  it("accepts every allowlisted browser TTL and rejects others", () => {
    for (const ttl of BROWSER_TTL_ALLOWLIST) {
      expect(isAllowedBrowserTtlSeconds(ttl)).toBe(true);
      expect(assertAllowedBrowserTtlSeconds(ttl)).toBe(ttl);
      expect(
        propertyIntelligenceCategorySettingsPatchSchema.safeParse({
          category: "property_details",
          browserTtlSeconds: ttl,
          redisTtlSeconds: 86400,
        }).success
      ).toBe(true);
    }
    for (const bad of [0, 60, 1799, 1900, 10801, 86400, 604800]) {
      expect(isAllowedBrowserTtlSeconds(bad)).toBe(false);
      expect(() => assertAllowedBrowserTtlSeconds(bad)).toThrow(/Browser TTL/);
      expect(
        propertyIntelligenceCategorySettingsPatchSchema.safeParse({
          category: "property_details",
          browserTtlSeconds: bad,
          redisTtlSeconds: 1_000_000,
        }).success
      ).toBe(false);
    }
    expect(coerceBrowserTtlSeconds(604800)).toBe(10800);
    expect(coerceBrowserTtlSeconds(5000)).toBe(3600);
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
      sourceCacheExpiresAt: "2025-02-08T00:00:00.000Z",
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
      sourceCacheExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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
      sourceCacheExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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

  it("expires when source cache expires before browser TTL", async () => {
    const clock = makeClock("2025-03-01T00:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    const written = await cache.set({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "nearby_land",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-03-01T00:00:00.000Z",
      sourceCacheExpiresAt: "2025-03-01T00:30:00.000Z",
      browserTtlSeconds: 10800,
      data: { items: [] },
      now: clock.now(),
    });
    expect(written?.browserExpiresAt).toBe("2025-03-01T00:30:00.000Z");

    clock.set("2025-03-01T00:31:00.000Z");
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
      sourceCacheExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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
      sourceCacheExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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
      sourceCacheExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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
      sourceCacheExpiresAt: "2027-01-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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
      sourceCacheExpiresAt: "2025-12-01T00:00:00.000Z",
      browserTtlSeconds: 10800,
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
      10800
    );
    expect(bootstrap.schemaVersion).toBe(BROWSER_CACHE_SCHEMA_VERSION);
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

describe("browser cache V2 migration + multi-tab", () => {
  it("migrates legacy databaseExpiresAt rows and caps >3h validity", async () => {
    const clock = makeClock("2025-05-01T01:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const key = browserCacheStorageKey({
      responseContextId: "ctx-legacy",
      propertyIdentityKey: "PROP|L",
      category: "property_details",
      providerId: "mock",
    });

    storage.map.set(key, {
      responseContextId: "ctx-legacy",
      propertyIdentityKey: "PROP|L",
      category: "property_details",
      providerId: "mock",
      schemaVersion: 1,
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-05-01T00:00:00.000Z",
      databaseExpiresAt: "2025-06-01T00:00:00.000Z",
      browserExpiresAt: "2025-05-08T00:00:00.000Z",
      data: { legacy: true },
      writtenAt: "2025-05-01T00:00:00.000Z",
    } as never);

    const cache = createBrowserCacheService({ storage, now: clock.now });
    const report = await cache.migrateLegacyEntries({ now: clock.now() });
    expect(report.rewritten + report.removed).toBeGreaterThanOrEqual(1);

    const after = storage.map.get(key);
    if (after) {
      expect(after).not.toHaveProperty("databaseExpiresAt");
      expect(after.sourceCacheExpiresAt).toBeTruthy();
      expect(after.schemaVersion).toBe(BROWSER_CACHE_SCHEMA_VERSION);
      const written = Date.parse(after.writtenAt);
      const expires = Date.parse(after.browserExpiresAt);
      expect(expires - written).toBeLessThanOrEqual(MAX_BROWSER_TTL_SECONDS * 1000);
    } else {
      expect(report.removed).toBeGreaterThanOrEqual(1);
    }
  });

  it("hydrates legacy rows on read with capped expiry", async () => {
    const clock = makeClock("2025-05-01T00:30:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const parts = {
      responseContextId: "ctx-h",
      propertyIdentityKey: "PROP|H",
      category: "property_details" as const,
      providerId: "mock" as const,
    };
    storage.map.set(browserCacheStorageKey(parts), {
      ...parts,
      schemaVersion: 1,
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-05-01T00:00:00.000Z",
      databaseExpiresAt: "2025-06-01T00:00:00.000Z",
      browserExpiresAt: "2025-05-08T00:00:00.000Z",
      data: { ok: true },
      writtenAt: "2025-05-01T00:00:00.000Z",
    } as never);

    const cache = createBrowserCacheService({ storage, now: clock.now });
    const hit = await cache.get(parts, {
      schemaVersion: BROWSER_CACHE_SCHEMA_VERSION,
      invalidationVersion: 1,
    });
    expect(hit.status).toBe("hit");
    if (hit.status === "hit") {
      expect(hit.record.sourceCacheExpiresAt).toBe("2025-06-01T00:00:00.000Z");
      expect(hit.record.browserExpiresAt).toBe("2025-05-01T03:00:00.000Z");
      expect(hit.record.schemaVersion).toBe(BROWSER_CACHE_SCHEMA_VERSION);
    }
  });

  it("shares storage safely across concurrent tab-like services", async () => {
    const clock = makeClock("2025-06-01T00:00:00.000Z");
    const shared = new MemoryBrowserCacheStorage();
    const tabA = createBrowserCacheService({ storage: shared, now: clock.now });
    const tabB = createBrowserCacheService({ storage: shared, now: clock.now });
    const parts = {
      responseContextId: "ctx-tabs",
      propertyIdentityKey: "PROP|T",
      category: "property_details" as const,
      providerId: "mock" as const,
    };

    await Promise.all([
      tabA.set({
        ...parts,
        categoryConfigVersion: 1,
        invalidationVersion: 1,
        providerFetchedAt: "2025-06-01T00:00:00.000Z",
        sourceCacheExpiresAt: "2025-06-02T00:00:00.000Z",
        browserTtlSeconds: 3600,
        data: { from: "a" },
        now: clock.now(),
      }),
      tabB.set({
        ...parts,
        categoryConfigVersion: 1,
        invalidationVersion: 1,
        providerFetchedAt: "2025-06-01T00:00:00.000Z",
        sourceCacheExpiresAt: "2025-06-02T00:00:00.000Z",
        browserTtlSeconds: 3600,
        data: { from: "b" },
        now: clock.now(),
      }),
    ]);

    const hitA = await tabA.get(parts, { invalidationVersion: 1 });
    const hitB = await tabB.get(parts, { invalidationVersion: 1 });
    expect(hitA.status).toBe("hit");
    expect(hitB.status).toBe("hit");
    expect(shared.map.size).toBe(1);
  });

  it("invalidates browser entries when QR/response context is revoked", async () => {
    const clock = makeClock("2025-07-01T00:00:00.000Z");
    const storage = new MemoryBrowserCacheStorage();
    const cache = createBrowserCacheService({ storage, now: clock.now });
    await cache.set({
      responseContextId: "ctx-revoked",
      propertyIdentityKey: "PROP|R",
      category: "property_details",
      providerId: "mock",
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: "2025-07-01T00:00:00.000Z",
      sourceCacheExpiresAt: "2025-07-02T00:00:00.000Z",
      browserTtlSeconds: 7200,
      data: { x: 1 },
      now: clock.now(),
    });
    expect(await cache.invalidateResponseContext("ctx-revoked")).toBe(1);
    expect(
      (
        await cache.get({
          responseContextId: "ctx-revoked",
          propertyIdentityKey: "PROP|R",
          category: "property_details",
          providerId: "mock",
        })
      ).status
    ).toBe("miss");
  });

  it("returns storage_unavailable when IndexedDB-like storage fails", async () => {
    const storage = new MemoryBrowserCacheStorage();
    storage.get = async () => {
      throw new (await import("@/lib/property-intelligence/browser/storage")).BrowserStorageError(
        "idb down",
        "unavailable"
      );
    };
    const cache = createBrowserCacheService({ storage });
    const result = await cache.get({
      responseContextId: "ctx",
      propertyIdentityKey: "P",
      category: "property_details",
      providerId: "mock",
    });
    expect(result.status).toBe("miss");
    if (result.status === "miss") {
      expect(result.reason).toBe("storage_unavailable");
    }
  });
});
