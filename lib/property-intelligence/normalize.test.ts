import { describe, expect, it } from "vitest";
import {
  extractZipFromText,
  normalizeCoordinates,
  normalizeListingStatus,
  normalizeMoney,
  normalizePropertyAddress,
  normalizePropertyType,
} from "@/lib/property-intelligence/normalize";

describe("normalizePropertyAddress", () => {
  it("preserves unit identifiers in the normalized key", () => {
    const id = normalizePropertyAddress(
      "123 Main St Apt 4B, Austin, TX 78701"
    );
    expect(id.components.unit).toBe("4B");
    expect(id.normalizedKey).toContain("UNIT:4B");
    expect(id.components.postalCode).toBe("78701");
    expect(id.components.adminArea).toBe("TX");
  });

  it("does not fabricate missing city or postal code", () => {
    const id = normalizePropertyAddress("123 Main St");
    expect(id.components.city).toBeNull();
    expect(id.components.postalCode).toBeNull();
    expect(id.components.line1).toContain("Main");
  });
});

describe("normalizeMoney / types / status / coords", () => {
  it("normalizes money without inventing values", () => {
    expect(normalizeMoney(250000)).toEqual({ amount: 250000, currency: "USD" });
    expect(normalizeMoney(null)).toBeNull();
    expect(normalizeMoney("not-a-number")).toBeNull();
  });

  it("maps property types", () => {
    expect(normalizePropertyType("Single Family")).toBe("single_family");
    expect(normalizePropertyType("Land")).toBe("land");
    expect(normalizePropertyType(undefined)).toBe("unknown");
  });

  it("maps listing statuses", () => {
    expect(normalizeListingStatus("Active")).toBe("active");
    expect(normalizeListingStatus("Inactive")).toBe("inactive");
    expect(normalizeListingStatus("")).toBe("unknown");
  });

  it("validates coordinates", () => {
    expect(normalizeCoordinates(29.4, -98.3)).toEqual({
      latitude: 29.4,
      longitude: -98.3,
    });
    expect(normalizeCoordinates(999, 0)).toBeNull();
    expect(normalizeCoordinates(null, -98)).toBeNull();
  });

  it("extracts ZIP codes", () => {
    expect(extractZipFromText("Austin, TX 78701-1234")).toBe("78701");
    expect(extractZipFromText("no zip")).toBeNull();
  });
});
