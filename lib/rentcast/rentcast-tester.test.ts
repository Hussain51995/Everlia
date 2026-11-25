import { describe, it, expect } from "vitest";
import { estimateCallCount, extractZipCode } from "./client";
import type { RentCastCategory } from "./client";

describe("estimateCallCount", () => {
  it("returns 0 for an empty category list", () => {
    expect(estimateCallCount([])).toBe(0);
  });

  it("returns 1 for a single category", () => {
    const cats: RentCastCategory[] = ["propertyDetails"];
    expect(estimateCallCount(cats)).toBe(1);
  });

  it("returns the count of selected categories", () => {
    const cats: RentCastCategory[] = [
      "propertyDetails",
      "valuation",
      "nearbyHouses",
      "nearbyLand",
      "marketStatistics",
    ];
    expect(estimateCallCount(cats)).toBe(5);
  });

  it("counts partial selections correctly", () => {
    const cats: RentCastCategory[] = ["valuation", "marketStatistics"];
    expect(estimateCallCount(cats)).toBe(2);
  });
});

describe("extractZipCode", () => {
  it("returns null for null input", () => {
    expect(extractZipCode(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(extractZipCode("hello")).toBeNull();
    expect(extractZipCode(42)).toBeNull();
  });

  it("extracts zipCode field from a plain object", () => {
    expect(extractZipCode({ zipCode: "78701" })).toBe("78701");
  });

  it("extracts zip_code field (alternative spelling)", () => {
    expect(extractZipCode({ zip_code: "90210" })).toBe("90210");
  });

  it("extracts zip field (short form)", () => {
    expect(extractZipCode({ zip: "10001" })).toBe("10001");
  });

  it("extracts ZIP from the first element of an array response", () => {
    expect(extractZipCode([{ zipCode: "30301" }])).toBe("30301");
  });

  it("returns null for empty array", () => {
    expect(extractZipCode([])).toBeNull();
  });

  it("extracts ZIP embedded in addressLine2", () => {
    expect(
      extractZipCode({ addressLine2: "Austin, TX 78701" })
    ).toBe("78701");
  });

  it("extracts ZIP+4 format from addressLine2 (returns 5-digit part)", () => {
    expect(
      extractZipCode({ addressLine2: "Boston, MA 02101-1234" })
    ).toBe("02101");
  });

  it("returns null when no zip information is available", () => {
    expect(extractZipCode({ city: "Austin", state: "TX" })).toBeNull();
  });

  it("prefers zipCode field over addressLine2", () => {
    expect(
      extractZipCode({ zipCode: "78701", addressLine2: "Austin, TX 99999" })
    ).toBe("78701");
  });
});
