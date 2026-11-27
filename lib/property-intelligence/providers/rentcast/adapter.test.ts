import { describe, expect, it, vi } from "vitest";
import { createRentCastProvider } from "@/lib/property-intelligence/providers/rentcast/adapter";
import type { RentCastHttpClient } from "@/lib/property-intelligence/providers/rentcast/http";
import {
  rentCastMarketStatisticsFixture,
  rentCastNearbyHousesFixture,
  rentCastNearbyLandFixture,
  rentCastPropertyDetailsFixture,
  rentCastValuationFixture,
  RENTCAST_FIXTURE_ADDRESS,
} from "@/lib/property-intelligence/providers/rentcast/fixtures";
import {
  defaultLandQuery,
  defaultResidentialQuery,
  makeLookup,
} from "@/lib/property-intelligence/test-helpers";

function mockHttp(
  handlers: Record<string, unknown>
): RentCastHttpClient {
  return {
    async get(path) {
      const data = handlers[path];
      if (data === undefined) {
        return {
          ok: false,
          httpStatus: 404,
          data: null,
          error: {
            code: "not_found",
            message: `No mock for ${path}`,
            retryable: false,
            providerId: "rentcast",
            httpStatus: 404,
          },
        };
      }
      return { ok: true, httpStatus: 200, data };
    },
  };
}

describe("RentCastPropertyDataProvider (mocked HTTP — no live calls)", () => {
  const lookup = makeLookup(RENTCAST_FIXTURE_ADDRESS);

  it("maps property details fixture into domain model", async () => {
    const provider = createRentCastProvider({
      http: mockHttp({ "/properties": rentCastPropertyDetailsFixture }),
    });
    const result = await provider.getPropertyDetails(lookup);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.source.isMock).toBe(false);
    expect(result.source.providerId).toBe("rentcast");
    expect(result.data.specifications.bedrooms).toBe(3);
    expect(result.data.specifications.propertyType).toBe("single_family");
    expect(result.data.lastSalePrice?.amount).toBe(270000);
    expect(result.data.identity.components.postalCode).toBe("78244");
  });

  it("maps valuation including subject details and comps", async () => {
    const provider = createRentCastProvider({
      http: mockHttp({ "/avm/value": rentCastValuationFixture }),
    });
    const result = await provider.getPropertyValuation(lookup);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.estimate?.amount).toBe(265000);
    expect(result.data.range.low?.amount).toBe(245000);
    expect(result.data.subjectDetails?.specifications.bedrooms).toBe(3);
    expect(result.data.comparables).toHaveLength(1);
    expect(result.data.comparables[0]?.listPrice?.amount).toBe(259900);
  });

  it("maps nearby residential and land listings", async () => {
    const provider = createRentCastProvider({
      http: mockHttp({
        "/listings/sale": rentCastNearbyHousesFixture,
      }),
    });
    const houses = await provider.getNearbyResidentialListings(
      lookup,
      defaultResidentialQuery()
    );
    expect(houses.status).toBe("ok");
    if (houses.status === "ok") {
      expect(houses.data[0]?.status).toBe("active");
      expect(houses.data[0]?.listPrice?.amount).toBe(320000);
    }

    const landProvider = createRentCastProvider({
      http: mockHttp({ "/listings/sale": rentCastNearbyLandFixture }),
    });
    const land = await landProvider.getNearbyLandListings(
      lookup,
      defaultLandQuery()
    );
    expect(land.status).toBe("ok");
    if (land.status === "ok") {
      expect(land.data[0]?.specifications.propertyType).toBe("land");
      expect(land.data[0]?.specifications.bedrooms).toBeNull();
    }
  });

  it("maps market statistics sale/rental/history", async () => {
    const provider = createRentCastProvider({
      http: mockHttp({ "/markets": rentCastMarketStatisticsFixture }),
    });
    const result = await provider.getMarketStatistics(lookup);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.zipCode).toBe("78244");
    expect(result.data.sale?.medianPrice?.amount).toBe(265000);
    expect(result.data.rental?.averagePrice?.amount).toBe(1650);
    expect(result.data.history?.series.length).toBe(2);
  });

  it("strips owner information from details responses", async () => {
    const dirty = [
      {
        ...rentCastPropertyDetailsFixture[0],
        owner: { names: ["SHOULD_NOT_LEAK"], type: "Individual" },
        owner1FullName: "SHOULD_NOT_LEAK",
        listingAgent: { name: "Agent", phone: "555-0100", email: "a@b.c" },
      },
    ];
    const provider = createRentCastProvider({
      http: mockHttp({ "/properties": dirty }),
    });
    const result = await provider.getPropertyDetails(lookup);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const json = JSON.stringify(result.data);
    expect(json).not.toContain("SHOULD_NOT_LEAK");
    expect(json).not.toContain("555-0100");
    expect(json).not.toContain("a@b.c");
  });

  it("returns invalid_input when market ZIP cannot be resolved", async () => {
    const provider = createRentCastProvider({
      http: mockHttp({}),
    });
    const result = await provider.getMarketStatistics({
      ...makeLookup("No Zip Street"),
      zipCode: null,
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.code).toBe("invalid_input");
    }
  });

  it("maps HTTP 429 to rate_limited via http client", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );
    const { createRentCastHttpClient } = await import(
      "@/lib/property-intelligence/providers/rentcast/http"
    );
    const http = createRentCastHttpClient({
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const provider = createRentCastProvider({ http });
    const result = await provider.getPropertyDetails(lookup);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.code).toBe("rate_limited");
      expect(result.error.retryable).toBe(true);
    }
    expect(fetchImpl).toHaveBeenCalled();
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Api-Key"]).toBe("test-key-not-real");
  });

  it("never exports raw RentCast keys like priceRangeLow on domain valuation", async () => {
    const provider = createRentCastProvider({
      http: mockHttp({ "/avm/value": rentCastValuationFixture }),
    });
    const result = await provider.getPropertyValuation(lookup);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data).not.toHaveProperty("priceRangeLow");
    expect(result.data).not.toHaveProperty("price");
    expect(result.data.estimate).toBeTruthy();
  });
});
