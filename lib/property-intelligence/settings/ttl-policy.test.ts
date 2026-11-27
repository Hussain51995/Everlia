import { describe, expect, it } from "vitest";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import {
  BROWSER_TTL_ALLOWLIST,
  BROWSER_TTL_LABELS,
  DEFAULT_BROWSER_TTL_SECONDS,
  DEFAULT_REDIS_TTL_SECONDS,
  REDIS_TTL_ALLOWLIST,
  REDIS_TTL_LABELS,
  assertAllowedBrowserTtlSeconds,
  assertAllowedRedisTtlSeconds,
  coerceRedisTtlSeconds,
  getRecommendedTtlDefaults,
} from "@/lib/property-intelligence/settings/ttl-policy";

describe("centralized TTL policy", () => {
  it("exposes exact browser dropdown labels", () => {
    expect([...BROWSER_TTL_ALLOWLIST]).toEqual([
      1800, 3600, 5400, 7200, 9000, 10800,
    ]);
    expect(BROWSER_TTL_LABELS[1800]).toBe("30 minutes");
    expect(BROWSER_TTL_LABELS[3600]).toBe("1 hour");
    expect(BROWSER_TTL_LABELS[5400]).toBe("1.5 hours");
    expect(BROWSER_TTL_LABELS[7200]).toBe("2 hours");
    expect(BROWSER_TTL_LABELS[9000]).toBe("2.5 hours");
    expect(BROWSER_TTL_LABELS[10800]).toBe("3 hours");
  });

  it("exposes exact Redis dropdown labels", () => {
    expect(REDIS_TTL_LABELS[86400]).toBe("1 day");
    expect(REDIS_TTL_LABELS[172800]).toBe("2 days");
    expect(REDIS_TTL_LABELS[259200]).toBe("3 days");
    expect(REDIS_TTL_LABELS[432000]).toBe("5 days");
    expect(REDIS_TTL_LABELS[604800]).toBe("7 days");
    expect(REDIS_TTL_LABELS[1209600]).toBe("14 days");
    expect(REDIS_TTL_LABELS[1814400]).toBe("21 days");
    expect(REDIS_TTL_LABELS[2592000]).toBe("30 days");
    expect(REDIS_TTL_LABELS[3888000]).toBe("45 days");
    expect(REDIS_TTL_LABELS[5184000]).toBe("60 days");
    expect(REDIS_TTL_LABELS[7776000]).toBe("90 days");
    expect(REDIS_TTL_ALLOWLIST).toHaveLength(11);
  });

  it("uses approved category defaults", () => {
    expect(DEFAULT_BROWSER_TTL_SECONDS.property_details).toBe(10800);
    expect(DEFAULT_BROWSER_TTL_SECONDS.property_valuation).toBe(10800);
    expect(DEFAULT_BROWSER_TTL_SECONDS.nearby_houses).toBe(7200);
    expect(DEFAULT_BROWSER_TTL_SECONDS.nearby_land).toBe(7200);
    expect(DEFAULT_BROWSER_TTL_SECONDS.market_statistics).toBe(10800);

    expect(DEFAULT_REDIS_TTL_SECONDS.property_details).toBe(7776000);
    expect(DEFAULT_REDIS_TTL_SECONDS.property_valuation).toBe(2592000);
    expect(DEFAULT_REDIS_TTL_SECONDS.nearby_houses).toBe(259200);
    expect(DEFAULT_REDIS_TTL_SECONDS.nearby_land).toBe(604800);
    expect(DEFAULT_REDIS_TTL_SECONDS.market_statistics).toBe(2592000);

    for (const category of PROPERTY_DATA_CATEGORIES) {
      const defaults = getRecommendedTtlDefaults(category);
      expect(defaults.browserTtlSeconds).toBeLessThanOrEqual(
        defaults.redisTtlSeconds
      );
      expect(() =>
        assertAllowedBrowserTtlSeconds(defaults.browserTtlSeconds)
      ).not.toThrow();
      expect(() =>
        assertAllowedRedisTtlSeconds(defaults.redisTtlSeconds)
      ).not.toThrow();
    }
  });

  it("coerces legacy Redis TTLs into the allowlist", () => {
    expect(coerceRedisTtlSeconds(15552000)).toBe(7776000);
    expect(coerceRedisTtlSeconds(100_000)).toBe(86400);
    expect(coerceRedisTtlSeconds(300_000)).toBe(259200);
  });
});
