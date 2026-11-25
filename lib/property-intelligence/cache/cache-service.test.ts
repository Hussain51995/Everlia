import { describe, expect, it } from "vitest";
import { addressNormalizationService } from "@/lib/property-intelligence/address-normalization";
import { MemoryPropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import { fingerprintParams, stableStringify } from "@/lib/property-intelligence/cache/keys";
import { resolveCustomerPropertyAddress } from "@/lib/property-intelligence/customer-property";

function makeService(options?: {
  disabled?: Set<string>;
  now?: () => Date;
}) {
  const cacheRepo = new MemoryPropertyCacheRepository();
  const identityRepo = new MemoryPropertyIdentityRepository();
  const service = createPropertyCacheService(cacheRepo, identityRepo, {
    isCategoryEnabled: (c) => !(options?.disabled?.has(c) ?? false),
    now: options?.now,
  });
  return { service, cacheRepo, identityRepo };
}

describe("address normalization + customer property source", () => {
  it("maps equivalent formatting to the same identity key", () => {
    const a = addressNormalizationService.normalize(
      "5500 Grand Lake Drive, San Antonio, Texas 78244"
    );
    const b = addressNormalizationService.normalize(
      "5500  GRAND LAKE DR, san antonio, tx 78244-1234"
    );
    expect(a.isUsable).toBe(true);
    expect(b.isUsable).toBe(true);
    expect(a.identity.normalizedKey).toBe(b.identity.normalizedKey);
    expect(addressNormalizationService.areEquivalent(
      "5500 Grand Lake Drive, San Antonio, Texas 78244",
      "5500 Grand Lake Dr, San Antonio, TX 78244"
    )).toBe(true);
  });

  it("does not merge different apartment units", () => {
    const u1 = addressNormalizationService.normalize(
      "100 Main St Apt 1, Austin, TX 78701"
    );
    const u2 = addressNormalizationService.normalize(
      "100 Main St Apt 2, Austin, TX 78701"
    );
    expect(u1.identity.normalizedKey).not.toBe(u2.identity.normalizedKey);
    expect(u1.identity.components.unit).toBe("1");
    expect(u2.identity.components.unit).toBe("2");
  });

  it("uses property_address only — not mailing fields", () => {
    const missing = resolveCustomerPropertyAddress({
      property_address: null,
      address_line1: "123 Mail Only St",
      city: "Austin",
      province_or_state: "TX",
      postal_or_zip: "78701",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("missing");

    const ok = resolveCustomerPropertyAddress({
      property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
      address_line1: "Different Mailing Rd",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.identity.components.postalCode).toBe("78244");
      expect(ok.address).toContain("Grand Lake");
    }
  });
});

describe("cache keys", () => {
  it("is deterministic and order-independent for params", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(fingerprintParams({ limit: 10, radiusMiles: 1 })).toBe(
      fingerprintParams({ radiusMiles: 1, limit: 10 })
    );
  });

  it("nearby listings with different radius get different keys", () => {
    const { service } = makeService();
    const k1 = service.nearbyKey("rentcast", "nearby_houses", "PROP|A", {
      kind: "residential",
      radiusMiles: 1,
      limit: 10,
    });
    const k2 = service.nearbyKey("rentcast", "nearby_houses", "PROP|A", {
      kind: "residential",
      radiusMiles: 5,
      limit: 10,
    });
    expect(k1.cacheKey).not.toBe(k2.cacheKey);
  });

  it("market keys are ZIP + country scoped for shared reuse", () => {
    const { service } = makeService();
    const k = service.marketKey("rentcast", {
      countryCode: "US",
      zipCode: "78244",
    });
    expect(k.normalizedIdentityKey).toBe("market:US:78244");
  });
});

describe("PropertyCacheService", () => {
  it("stores and returns valid per-category cache independently", async () => {
    const { service, identityRepo } = makeService();
    const resolved = resolveCustomerPropertyAddress({
      property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const identity = await identityRepo.ensureIdentity({
      identity: resolved.identity,
      rawAddress: resolved.address,
      aliasKey: resolved.aliasKey,
    });

    const detailsKey = service.detailsKey(
      "rentcast",
      resolved.identity.normalizedKey
    );
    const valuationKey = service.valuationKey(
      "rentcast",
      resolved.identity.normalizedKey
    );

    const fetchedAt = new Date().toISOString();

    await service.store({
      providerId: "rentcast",
      category: "property_details",
      key: detailsKey,
      identityId: identity.id,
      payload: { bedrooms: 3 },
      ttl: { databaseTtlSeconds: 3600 },
      fetchedAt,
    });

    await service.store({
      providerId: "rentcast",
      category: "property_valuation",
      key: valuationKey,
      identityId: identity.id,
      payload: { estimate: 265000 },
      ttl: { databaseTtlSeconds: 3600 },
      fetchedAt,
    });

    const batch = await service.getMany([
      { providerId: "rentcast", category: "property_details", key: detailsKey },
      {
        providerId: "rentcast",
        category: "property_valuation",
        key: valuationKey,
      },
    ]);

    const detailsHit = batch.get(detailsKey.cacheKey);
    const valuationHit = batch.get(valuationKey.cacheKey);
    expect(detailsHit?.status).toBe("hit");
    expect(valuationHit?.status).toBe("hit");
    if (detailsHit?.status === "hit") {
      expect(detailsHit.record.fetchedAt).toBe(fetchedAt);
      expect(detailsHit.record.payload).toEqual({ bedrooms: 3 });
    }
  });

  it("reuses identity across differently formatted addresses (shared cache)", async () => {
    const { service, identityRepo } = makeService();
    const a = resolveCustomerPropertyAddress({
      property_address: "5500 Grand Lake Drive, San Antonio, TX 78244",
    });
    const b = resolveCustomerPropertyAddress({
      property_address: "5500 Grand Lake Dr, San Antonio, Texas 78244",
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    const idA = await identityRepo.ensureIdentity({
      identity: a.identity,
      rawAddress: a.address,
      aliasKey: a.aliasKey,
    });
    const idB = await identityRepo.ensureIdentity({
      identity: b.identity,
      rawAddress: b.address,
      aliasKey: b.aliasKey,
    });
    expect(idA.id).toBe(idB.id);

    const key = service.detailsKey("rentcast", a.identity.normalizedKey);
    await service.store({
      providerId: "rentcast",
      category: "property_details",
      key,
      identityId: idA.id,
      payload: { shared: true },
      ttl: { databaseTtlSeconds: 3600 },
    });

    const hit = await service.getValid({
      providerId: "rentcast",
      category: "property_details",
      key: service.detailsKey("rentcast", b.identity.normalizedKey),
    });
    expect(hit.status).toBe("hit");
  });

  it("shares market statistics by ZIP across customers", async () => {
    const { service } = makeService();
    const key = service.marketKey("rentcast", {
      countryCode: "us",
      zipCode: "78244",
    });
    await service.store({
      providerId: "rentcast",
      category: "market_statistics",
      key,
      payload: { medianPrice: 265000 },
      ttl: { databaseTtlSeconds: 86400 },
    });

    const again = await service.getValid({
      providerId: "rentcast",
      category: "market_statistics",
      key: service.marketKey("rentcast", {
        countryCode: "US",
        zipCode: "78244",
      }),
    });
    expect(again.status).toBe("hit");
  });

  it("treats expired and invalidated rows as misses without rewriting fetchedAt", async () => {
    let now = new Date("2025-01-01T00:00:00.000Z");
    const { service, cacheRepo } = makeService({ now: () => now });
    const key = service.detailsKey("rentcast", "PROP|1");

    await service.store({
      providerId: "rentcast",
      category: "property_details",
      key,
      payload: { x: 1 },
      ttl: { databaseTtlSeconds: 10 },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });

    now = new Date("2025-01-01T00:00:15.000Z");
    const expired = await service.getValid({
      providerId: "rentcast",
      category: "property_details",
      key,
    });
    expect(expired.status).toBe("miss");
    if (expired.status === "miss") expect(expired.reason).toBe("expired");

    const row = await cacheRepo.getByCacheKey(key.cacheKey);
    expect(row?.fetchedAt).toBe("2025-01-01T00:00:00.000Z");

    now = new Date("2025-01-01T00:00:00.000Z");
    await service.store({
      providerId: "rentcast",
      category: "property_details",
      key,
      payload: { x: 2 },
      ttl: { databaseTtlSeconds: 1000 },
      fetchedAt: "2025-01-01T00:00:00.000Z",
    });
    await service.invalidateProperty("PROP|1");
    const invalidated = await service.getValid({
      providerId: "rentcast",
      category: "property_details",
      key,
    });
    expect(invalidated.status).toBe("miss");
    if (invalidated.status === "miss") {
      expect(invalidated.reason).toBe("invalidated");
    }
  });

  it("respects disabled categories and provider changes", async () => {
    const { service } = makeService({
      disabled: new Set(["nearby_land"]),
    });
    const key = service.nearbyKey("rentcast", "nearby_land", "CENTER", {
      kind: "land",
      radiusMiles: 5,
      limit: 10,
    });
    await service.store({
      providerId: "rentcast",
      category: "nearby_land",
      key,
      payload: { listings: [] },
      ttl: { databaseTtlSeconds: 3600 },
    });
    const disabled = await service.getValid({
      providerId: "rentcast",
      category: "nearby_land",
      key,
    });
    expect(disabled.status).toBe("miss");
    if (disabled.status === "miss") {
      expect(disabled.reason).toBe("category_disabled");
    }

    const detailsKey = service.detailsKey("rentcast", "PROP|X");
    await service.store({
      providerId: "rentcast",
      category: "property_details",
      key: detailsKey,
      payload: { ok: true },
      ttl: { databaseTtlSeconds: 3600 },
    });
    const providerMiss = await service.getValid({
      providerId: "zillow",
      category: "property_details",
      key: detailsKey,
    });
    expect(providerMiss.status).toBe("miss");
    if (providerMiss.status === "miss") {
      expect(providerMiss.reason).toBe("provider_mismatch");
    }
  });

  it("supports negative caching for verified empty results only", async () => {
    const { service } = makeService();
    const key = service.detailsKey("rentcast", "MISSING|PROP");
    await service.storeNegative({
      providerId: "rentcast",
      category: "property_details",
      key,
      reason: "not_found",
      message: "No property record",
    });
    const hit = await service.getValid({
      providerId: "rentcast",
      category: "property_details",
      key,
    });
    expect(hit.status).toBe("hit");
    if (hit.status === "hit") {
      expect(hit.isNegative).toBe(true);
    }
  });

  it("rejects payloads with organization-private fields", async () => {
    const { service } = makeService();
    const key = service.detailsKey("rentcast", "PROP|SAFE");
    await expect(
      service.store({
        providerId: "rentcast",
        category: "property_details",
        key,
        payload: { organization_id: "org-1", bedrooms: 3 },
        ttl: { databaseTtlSeconds: 60 },
      })
    ).rejects.toThrow(/private key/);
  });

  it("invalidates by ZIP / provider / category", async () => {
    const { service } = makeService();
    const marketKey = service.marketKey("rentcast", {
      countryCode: "US",
      zipCode: "78701",
    });
    await service.store({
      providerId: "rentcast",
      category: "market_statistics",
      key: marketKey,
      payload: { totalListings: 10 },
      ttl: { databaseTtlSeconds: 3600 },
    });
    expect(await service.invalidateZip({ countryCode: "US", zipCode: "78701" })).toBe(1);
    const miss = await service.getValid({
      providerId: "rentcast",
      category: "market_statistics",
      key: marketKey,
    });
    expect(miss.status).toBe("miss");

    const dKey = service.detailsKey("rentcast", "PROP|Z");
    await service.store({
      providerId: "rentcast",
      category: "property_details",
      key: dKey,
      payload: { a: 1 },
      ttl: { databaseTtlSeconds: 3600 },
    });
    expect(await service.invalidateProvider("rentcast")).toBeGreaterThan(0);
    expect(
      (
        await service.getValid({
          providerId: "rentcast",
          category: "property_details",
          key: dKey,
        })
      ).status
    ).toBe("miss");
  });

  it("handles concurrent upserts for the same cache key", async () => {
    const { service, cacheRepo } = makeService();
    const key = service.detailsKey("rentcast", "PROP|CONCURRENT");

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        service.store({
          providerId: "rentcast",
          category: "property_details",
          key,
          payload: { n: i },
          ttl: { databaseTtlSeconds: 3600 },
          fetchedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, i)).toISOString(),
        })
      )
    );

    const row = await cacheRepo.getByCacheKey(key.cacheKey);
    expect(row).toBeTruthy();
    expect(row?.status).toBe("active");
    expect(typeof (row?.payload as { n: number }).n).toBe("number");
  });

  it("does not put QR tokens or customer names into shared identity metadata", async () => {
    const { identityRepo } = makeService();
    const resolved = resolveCustomerPropertyAddress({
      property_address: "1 Test St, Austin, TX 78701",
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const row = await identityRepo.ensureIdentity({
      identity: resolved.identity,
      rawAddress: resolved.address,
    });
    expect(row.metadata).not.toHaveProperty("qr_token");
    expect(row.metadata).not.toHaveProperty("customer_id");
    expect(row.metadata).not.toHaveProperty("organization_id");
  });
});
