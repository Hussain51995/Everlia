
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { MemoryPropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { createCacheCleanupService } from "@/lib/property-intelligence/cache/cleanup";
import { createCacheInvalidationService } from "@/lib/property-intelligence/cache/invalidation";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import { buildMarketStatisticsCacheKey } from "@/lib/property-intelligence/cache/keys";
import { evaluateCacheFreshness } from "@/lib/property-intelligence/cache/freshness";
import { buildCategoryCachePolicy } from "@/lib/property-intelligence/cache/policy";
import {
  createStubBudgetGateway,
  StubPropertyBudgetGateway,
} from "@/lib/property-intelligence/execution/budget-gateway";
import {
  createBudgetService,
} from "@/lib/property-intelligence/execution/budget-service";
import { MemoryPropertyBudgetRepository } from "@/lib/property-intelligence/execution/budget-repository";
import { createProviderExecutionGateway } from "@/lib/property-intelligence/execution/provider-gateway";
import { MemoryPropertyFetchDedupeRepository } from "@/lib/property-intelligence/execution/dedupe";
import {
  createUsageTracker,
  MemoryPropertyUsageRepository,
} from "@/lib/property-intelligence/execution/usage-tracker";
import { createAltavistaProvider } from "@/lib/property-intelligence/providers/altavista/provider";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { PropertyProviderRegistry } from "@/lib/property-intelligence/providers/registry";
import { MemoryPropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { createPropertyIntelligenceService } from "@/lib/property-intelligence/service/property-intelligence-service";
import {
  assertPublicSafeBrowserPayload,
  createBrowserCacheService,
} from "@/lib/property-intelligence/browser/cache-service";
import {
  BrowserStorageError,
  MemoryBrowserCacheStorage,
} from "@/lib/property-intelligence/browser/storage";
import { MemoryPropertyFetchLockRepository } from "@/lib/property-intelligence/cache/fetch-locks";
import { listAdminProviderCatalog, providerSupportsCategory } from "@/lib/property-intelligence/admin/provider-catalog";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import { sanitizeInsightsForPublic } from "@/lib/property-intelligence/api/contract";

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const authA = {
  organizationId: "org-a",
  customerId: "cust-a",
  customer: {
    property_address: "5500 Grand Lake Dr, San Antonio, TX 78244",
  },
};

const authBSameProperty = {
  organizationId: "org-b",
  customerId: "cust-b",
  customer: {
    property_address: "5500 Grand Lake Drive, San Antonio, Texas 78244",
  },
};

function buildInstrumentedService(options?: {
  featureEnabled?: boolean;
  monthlyBudget?: number;
  disable?: PropertyDataCategory[];
  categoryProviders?: Partial<Record<PropertyDataCategory, string>>;
  useGateway?: boolean;
  includeAltavista?: boolean;
}) {
  const settings = new MemoryPropertyIntelligenceSettingsRepository();
  settings.setFeatureEnabled(options?.featureEnabled ?? true);
  for (const c of PROPERTY_DATA_CATEGORIES) {
    settings.setCategoryProvider(c, "mock");
  }
  for (const c of options?.disable ?? []) {
    settings.setCategoryEnabled(c, false);
  }
  if (options?.categoryProviders) {
    for (const [cat, providerId] of Object.entries(options.categoryProviders)) {
      settings.setCategoryProvider(cat as PropertyDataCategory, providerId);
    }
  }

  const mock = createMockProvider({ scenario: "success" });
  const altavista = createAltavistaProvider();
  const registry = new PropertyProviderRegistry({ defaultProviderId: "mock" });
  registry.register(mock);
  if (options?.includeAltavista !== false) {
    registry.register(altavista);
  }

  const cacheRepo = new MemoryPropertyCacheRepository();
  const cache = createPropertyCacheService(
    cacheRepo,
    new MemoryPropertyIdentityRepository()
  );

  const stub = createStubBudgetGateway({
    allow: true,
    monthlyBudget: options?.monthlyBudget ?? 100,
  });

  const budgetGateway = options?.useGateway
    ? createProviderExecutionGateway({
        budget: createBudgetService(new MemoryPropertyBudgetRepository(), {
          monthlyBudget: options.monthlyBudget ?? 50,
          apiAccountScope: "default",
        }),
        dedupe: new MemoryPropertyFetchDedupeRepository(),
        usage: createUsageTracker(new MemoryPropertyUsageRepository()),
        enforceBudgetForMock: true,
      })
    : stub;

  const service = createPropertyIntelligenceService({
    settings,
    cache,
    registry,
    budget: budgetGateway,
  });

  return {
    service,
    settings,
    cache,
    cacheRepo,
    registry,
    mock,
    altavista,
    stub: options?.useGateway ? null : stub,
    budget: budgetGateway,
  };
}

describe("FINAL AUDIT — functional categories", () => {
  it("returns all five categories when enabled", async () => {
    const { service } = buildInstrumentedService();
    const result = await service.getInsights({ auth: authA });
    for (const category of PROPERTY_DATA_CATEGORIES) {
      expect(result.categories[category].status).toBe("available");
      expect(result.categories[category].data).toBeTruthy();
    }
  });

  it("independently disables each category", async () => {
    for (const disabled of PROPERTY_DATA_CATEGORIES) {
      const { service, altavista, mock } = buildInstrumentedService({
        disable: [disabled],
      });
      mock; // registered
      const result = await service.getInsights({ auth: authA });
      expect(result.categories[disabled].status).toBe("disabled");
      expect(result.categories[disabled].data).toBeNull();
      for (const other of PROPERTY_DATA_CATEGORIES) {
        if (other === disabled) continue;
        expect(result.categories[other].status).not.toBe("disabled");
      }
      void altavista;
    }
  });

  it("all categories disabled still yields greeting-compatible envelope", async () => {
    const { service, stub } = buildInstrumentedService({
      disable: [...PROPERTY_DATA_CATEGORIES],
    });
    const result = await service.getInsights({ auth: authA });
    expect(result.featureEnabled).toBe(true);
    for (const category of PROPERTY_DATA_CATEGORIES) {
      expect(result.categories[category].status).toBe("disabled");
    }
    expect(stub?.getUsedUnits()).toBe(0);
  });

  it("feature off leaves original experience unaffected (no fetches)", async () => {
    const { service, stub } = buildInstrumentedService({ featureEnabled: false });
    const result = await service.getInsights({ auth: authA });
    expect(result.featureEnabled).toBe(false);
    expect(stub?.getUsedUnits()).toBe(0);
  });
});

describe("FINAL AUDIT — cache hierarchy A–K", () => {
  it("B/C: first miss hits provider; second hit uses L2 only", async () => {
    const counting = createMockProvider({ scenario: "success" });
    const settings = new MemoryPropertyIntelligenceSettingsRepository();
    settings.setFeatureEnabled(true);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      settings.setCategoryProvider(c, "mock");
    }
    const registry = new PropertyProviderRegistry({ defaultProviderId: "mock" });
    let detailsCalls = 0;
    const original = counting.getPropertyDetails.bind(counting);
    counting.getPropertyDetails = async (input) => {
      detailsCalls += 1;
      return original(input);
    };

    registry.register(counting);
    const cache = createPropertyCacheService(
      new MemoryPropertyCacheRepository(),
      new MemoryPropertyIdentityRepository()
    );
    const stub = createStubBudgetGateway({ monthlyBudget: 100 });
    const service = createPropertyIntelligenceService({
      settings,
      cache,
      registry,
      budget: stub,
    });

    await service.getInsights({
      auth: authA,
      requestedCategories: ["property_details"],
    });
    expect(detailsCalls).toBe(1);

    await service.getInsights({
      auth: authA,
      requestedCategories: ["property_details"],
    });
    expect(detailsCalls).toBe(1);
  });

  it("D: three cached, two missing → fetch only missing", async () => {
    const { service, mock } = buildInstrumentedService();
    await service.getInsights({
      auth: authA,
      requestedCategories: [
        "property_details",
        "property_valuation",
        "nearby_houses",
      ],
    });

    let land = 0;
    let market = 0;
    let details = 0;
    const landOrig = mock.getNearbyLandListings.bind(mock);
    const marketOrig = mock.getMarketStatistics.bind(mock);
    const detailsOrig = mock.getPropertyDetails.bind(mock);
    mock.getNearbyLandListings = async (i, q) => {
      land += 1;
      return landOrig(i, q);
    };
    mock.getMarketStatistics = async (i) => {
      market += 1;
      return marketOrig(i);
    };
    mock.getPropertyDetails = async (i) => {
      details += 1;
      return detailsOrig(i);
    };

    await service.getInsights({ auth: authA });
    expect(land).toBe(1);
    expect(market).toBe(1);
    expect(details).toBe(0);
  });

  it("F: different customers same property reuse L2 identity", async () => {
    const { service, stub } = buildInstrumentedService();
    await service.getInsights({
      auth: authA,
      requestedCategories: ["property_details"],
    });
    const usedAfterFirst = stub!.getUsedUnits();
    await service.getInsights({
      auth: authBSameProperty,
      requestedCategories: ["property_details"],
    });
    expect(stub!.getUsedUnits()).toBe(usedAfterFirst);
  });

  it("G: same ZIP reuses market statistics cache key identity", async () => {
    const key1 = buildMarketStatisticsCacheKey({
      providerId: "mock",
      market: { countryCode: "US", zipCode: "78244" },
    });
    const key2 = buildMarketStatisticsCacheKey({
      providerId: "mock",
      market: { countryCode: "US", zipCode: "78244" },
    });
    expect(key1.cacheKey).toBe(key2.cacheKey);
    expect(key1.normalizedIdentityKey).toContain("78244");
  });

  it("H: admin disables cached category → no fetch / disabled status", async () => {
    const { service, settings, stub, mock } = buildInstrumentedService();
    await service.getInsights({
      auth: authA,
      requestedCategories: ["nearby_land"],
    });
    const used = stub!.getUsedUnits();
    let landCalls = 0;
    const orig = mock.getNearbyLandListings.bind(mock);
    mock.getNearbyLandListings = async (i, q) => {
      landCalls += 1;
      return orig(i, q);
    };
    settings.setCategoryEnabled("nearby_land", false);
    const after = await service.getInsights({ auth: authA });
    expect(after.categories.nearby_land.status).toBe("disabled");
    expect(landCalls).toBe(0);
    expect(stub!.getUsedUnits()).toBeGreaterThanOrEqual(used);
  });

  it("I: TTL tighten recalculates validity from fetched_at", async () => {
    const fetchedAt = "2026-06-01T12:00:00.000Z";
    const record = {
      id: "1",
      cacheKey: "k",
      providerId: "mock",
      providerDataset: null,
      category: "property_details" as const,
      identityId: null,
      normalizedIdentityKey: "P",
      requestParams: {},
      requestParamsFingerprint: "fp",
      payload: { ok: true },
      schemaVersion: 1,
      accessScope: "public_qr",
      fetchedAt,
      expiresAt: "2026-06-02T12:00:00.000Z",
      sourceDataAt: null,
      status: "active" as const,
      invalidatedAt: null,
      createdAt: fetchedAt,
      updatedAt: fetchedAt,
    };

    const long = evaluateCacheFreshness({
      record,
      expected: {
        providerId: "mock",
        category: "property_details",
        cacheKey: "k",
      },
      policy: buildCategoryCachePolicy({ databaseTtlSeconds: 86_400 }),
      now: new Date("2026-06-01T12:30:00.000Z"),
    });
    expect(long.status).toBe("hit");

    const short = evaluateCacheFreshness({
      record,
      expected: {
        providerId: "mock",
        category: "property_details",
        cacheKey: "k",
      },
      policy: buildCategoryCachePolicy({ databaseTtlSeconds: 60 }),
      now: new Date("2026-06-01T12:30:00.000Z"),
    });
    expect(short.status).toBe("miss");
    if (short.status === "miss") {
      expect(short.tightenedByConfig).toBe(true);
    }
  });

  it("J: provider change uses provider-specific cache identity", async () => {
    const mockKey = buildMarketStatisticsCacheKey({
      providerId: "mock",
      market: { countryCode: "US", zipCode: "78244" },
    });
    const altaKey = buildMarketStatisticsCacheKey({
      providerId: "altavista",
      market: { countryCode: "US", zipCode: "78244" },
    });
    expect(mockKey.cacheKey).not.toBe(altaKey.cacheKey);
  });

  it("K: browser storage unavailable → miss, no throw", async () => {
    const storage = new MemoryBrowserCacheStorage();
    const service = createBrowserCacheService({
      storage,
      browserCachingEnabled: true,
    });
    storage.get = async () => {
      throw new BrowserStorageError("IndexedDB blocked", "unavailable");
    };
    const result = await service.get({
      responseContextId: "ctx",
      propertyIdentityKey: "PROP|1",
      category: "property_details",
      providerId: "mock",
    });
    expect(result.status).toBe("miss");
  });

  it("A: browser L1 hit contract — fresh record served without provider", async () => {
    const storage = new MemoryBrowserCacheStorage();
    const browser = createBrowserCacheService({
      storage,
      now: () => new Date("2026-06-01T12:05:00.000Z"),
    });
    const now = new Date("2026-06-01T12:00:00.000Z");
    await browser.set({
      responseContextId: "ctx-1",
      propertyIdentityKey: "PROP|1",
      category: "property_valuation",
      providerId: "mock",
      schemaVersion: 1,
      categoryConfigVersion: 1,
      invalidationVersion: 1,
      providerFetchedAt: now.toISOString(),
      databaseExpiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
      browserTtlSeconds: 3600,
      responseContextValidUntil: new Date(now.getTime() + 86_400_000).toISOString(),
      data: {
        estimate: { amount: 1, currency: "USD" },
        range: { low: null, high: null },
        subjectDetails: null,
        comparables: [],
      },
    });
    const hit = await browser.get(
      {
        responseContextId: "ctx-1",
        propertyIdentityKey: "PROP|1",
        category: "property_valuation",
        providerId: "mock",
      },
      {
        schemaVersion: 1,
        categoryConfigVersion: 1,
        invalidationVersion: 1,
        propertyIdentityKey: "PROP|1",
      }
    );
    expect(hit.status).toBe("hit");
  });
});

describe("FINAL AUDIT — API cost protection", () => {
  it("no provider calls for disabled categories or feature-off", async () => {
    const { service, stub } = buildInstrumentedService({
      featureEnabled: false,
    });
    await service.getInsights({ auth: authA });
    expect(stub!.getUsedUnits()).toBe(0);
  });

  it("no provider calls during invalidation or cleanup", async () => {
    const { cacheRepo, mock } = buildInstrumentedService();
    let calls = 0;
    const orig = mock.getPropertyDetails.bind(mock);
    mock.getPropertyDetails = async (i) => {
      calls += 1;
      return orig(i);
    };
    const invalidation = createCacheInvalidationService(cacheRepo);
    await invalidation.invalidate({ scope: "all" });
    const cleanup = createCacheCleanupService({
      cacheRepo,
      lockRepo: new MemoryPropertyFetchLockRepository(),
      now: () => new Date(),
    });
    const report = await cleanup.run();
    expect(report.triggeredProviderFetch).toBe(false);
    expect(calls).toBe(0);
  });

  it("budget exhaust stops further provider spend", async () => {
    const { service } = buildInstrumentedService({ monthlyBudget: 1 });
    const result = await service.getInsights({ auth: authA });
    const statuses = PROPERTY_DATA_CATEGORIES.map(
      (c) => result.categories[c].status
    );
    expect(statuses.some((s) => s === "budget_exhausted" || s === "available")).toBe(
      true
    );
    const available = statuses.filter((s) => s === "available").length;
    expect(available).toBeLessThan(5);
  });

  it("gateway path enforces budget for mock", async () => {
    const { service } = buildInstrumentedService({
      useGateway: true,
      monthlyBudget: 1,
    });
    const result = await service.getInsights({
      auth: authA,
      requestedCategories: ["property_details", "nearby_houses", "nearby_land"],
    });
    const denied = PROPERTY_DATA_CATEGORIES.filter(
      (c) => result.categories[c].status === "budget_exhausted"
    );
    expect(denied.length).toBeGreaterThan(0);
  });
});

describe("FINAL AUDIT — provider replacement (Altavista)", () => {
  it("maps different external shape into normalized domain models", async () => {
    const provider = createAltavistaProvider();
    const lookup = {
      address: "5500 Grand Lake Dr, San Antonio, TX 78244",
      identity: {
        normalizedKey: "TEST",
        components: {
          formatted: null,
          line1: null,
          line2: null,
          unit: null,
          city: null,
          adminArea: null,
          postalCode: "78244",
          countryCode: "US",
        },
        providerPropertyId: null,
        coordinates: null,
      },
      zipCode: "78244",
      organizationId: null,
      customerId: null,
    };
    const details = await provider.getPropertyDetails(lookup);
    expect(details.status).toBe("ok");
    if (details.status === "ok") {
      expect(details.data.specifications.bedrooms).toBe(4);
      expect(details.data.identity.providerPropertyId).toBe("AV-PROP-998877");
      expect(details.source.isMock).toBe(true);
    }
    const nearby = await provider.getNearbyResidentialListings(lookup, {
      kind: "residential",
      radiusMiles: 1,
      limit: 10,
    });
    expect(nearby.status).toBe("unsupported");
  });

  it("mixed-provider configuration works without core model changes", async () => {
    const { service } = buildInstrumentedService({
      includeAltavista: true,
      categoryProviders: {
        property_details: "mock",
        property_valuation: "altavista",
        nearby_houses: "mock",
        nearby_land: "mock",
        market_statistics: "altavista",
      },
    });
    const result = await service.getInsights({ auth: authA });
    expect(result.categories.property_details.source?.providerId).toBe("mock");
    expect(result.categories.property_valuation.source?.providerId).toBe(
      "altavista"
    );
    expect(result.categories.nearby_houses.source?.providerId).toBe("mock");
    expect(result.categories.market_statistics.source?.providerId).toBe(
      "altavista"
    );
    expect(result.categories.property_valuation.data).toMatchObject({
      estimate: { amount: 405000 },
    });
  });

  it("unsupported Altavista listings are handled gracefully", async () => {
    const { service } = buildInstrumentedService({
      categoryProviders: {
        nearby_houses: "altavista",
        nearby_land: "altavista",
      },
    });
    const result = await service.getInsights({
      auth: authA,
      requestedCategories: ["nearby_houses", "nearby_land"],
    });
    expect(["unsupported", "unavailable", "error"]).toContain(
      result.categories.nearby_houses.status
    );
  });

  it("QR UI / domain models contain no RentCast field names", () => {
    const ui = readRepo(
      "components/respond/property-insights/ValuationSection.tsx"
    );
    expect(ui).not.toMatch(/avm\/value|\/properties|rentCast/i);
    expect(ui).toContain("estimate");
    const types = readRepo("lib/types/property-intelligence.ts");
    expect(types).toContain("PropertyValuation");
    expect(types).not.toContain("av_property_id");
  });

  it("admin catalog lists Altavista after adapter registration", () => {
    const catalog = listAdminProviderCatalog();
    expect(catalog.some((p) => p.id === "altavista")).toBe(true);
    expect(providerSupportsCategory("altavista", "property_valuation")).toBe(
      true
    );
    expect(providerSupportsCategory("altavista", "nearby_houses")).toBe(false);
  });
});

describe("FINAL AUDIT — security contracts", () => {
  it("public sanitize strips disabled category data", () => {
    const empty = {
      featureEnabled: true,
      identity: null,
      retrievedAt: new Date().toISOString(),
      categories: Object.fromEntries(
        PROPERTY_DATA_CATEGORIES.map((c) => [
          c,
          {
            category: c,
            status: "disabled" as const,
            data: { secret: true },
            source: null,
            error: null,
            cache: null,
          },
        ])
      ),
    } as never;
    const sanitized = sanitizeInsightsForPublic(empty);
    for (const c of PROPERTY_DATA_CATEGORIES) {
      expect(sanitized.categories[c].data).toBeNull();
    }
  });

  it("browser payload rejects private owner fields", () => {
    expect(() =>
      assertPublicSafeBrowserPayload({
        estimate: { amount: 1, currency: "USD" },
        email: "owner@example.com",
      })
    ).toThrow();
  });

  it("respond + insights routes require QR path and private cache headers", () => {
    const respond = readRepo("app/api/respond/[token]/route.ts");
    const insights = readRepo(
      "app/api/respond/[token]/property-insights/route.ts"
    );
    expect(respond).toContain("qr_tokens");
    expect(respond).toContain("private, no-store");
    expect(insights).toContain("qr_tokens");
    expect(insights).toContain("checkPublicInsightsRateLimit");
    expect(insights).toContain("PROPERTY_INSIGHTS_NO_STORE_HEADERS");
    expect(insights).not.toContain("RENTCAST_API_KEY");
    expect(insights).toContain("property_address");
  });

  it("admin routes use requirePlatformAdmin", () => {
    for (const file of [
      "app/api/admin/property-intelligence/settings/route.ts",
      "app/api/admin/property-intelligence/cache/invalidate/route.ts",
      "app/api/admin/property-intelligence/usage/route.ts",
    ]) {
      expect(readRepo(file)).toContain("requirePlatformAdmin");
    }
  });

  it("migrations enforce RLS on PI tables and no school objects", () => {
    const names = readdirSync(resolve(process.cwd(), "supabase/migrations"));
    for (const n of ["036", "037", "038"]) {
      const file = names.find((f) => f.startsWith(`${n}_`));
      expect(file).toBeTruthy();
      const sql = readRepo(`supabase/migrations/${file!}`).toLowerCase();
      expect(sql).toMatch(/enable row level security|row level security/);
      expect(sql).not.toMatch(
        /create\s+table\s+public\.\w*school|school_rating|school_district/
      );
    }
    const rpc = names.find((f) => f.startsWith("039_"));
    expect(rpc).toBeTruthy();
    const rpcSql = readRepo(`supabase/migrations/${rpc!}`).toLowerCase();
    expect(rpcSql).toContain("property_intelligence_consume_units");
    expect(rpcSql).not.toMatch(
      /create\s+table\s+public\.\w*school|school_rating|school_district/
    );
  });
});

describe("FINAL AUDIT — permanent school exclusion", () => {
  it("domain, UI, docs, admin, APIs exclude school data", () => {
    const paths = [
      "lib/types/property-intelligence.ts",
      "components/respond/property-insights/PropertyInsightsExperience.tsx",
      "lib/property-intelligence/admin/provider-catalog.ts",
      "docs/architecture/property-intelligence.md",
      "docs/security/property-intelligence.md",
    ];
    for (const p of paths) {
      const text = readRepo(p).toLowerCase();
      expect(text).not.toMatch(
        /school_rating|school_district|nearby_schools|school_list/
      );
    }
    expect(PROPERTY_DATA_CATEGORIES).not.toContain("schools" as never);
  });
});

describe("FINAL AUDIT — live provider verification status", () => {
  it("does not claim live RentCast verification in this suite", () => {
    expect(true).toBe(true);
  });
});
