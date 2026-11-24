import { describe, expect, it } from "vitest";
import { customerCreateSchema, customerUpdateSchema } from "@/lib/validations/cards";

describe("Customer schemas with property_address", () => {
  it("validates creation with property_address", () => {
    const res = customerCreateSchema.safeParse({
      first_name: "Jane",
      last_name: "Doe",
      address_line1: "123 Main St",
      city: "Springfield",
      province_or_state: "IL",
      postal_or_zip: "62701",
      country_code: "US",
      property_address: "456 Elm St, Springfield, IL 62704",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.property_address).toBe("456 Elm St, Springfield, IL 62704");
    }
  });

  it("fails creation without property_address because it is compulsory", () => {
    const res = customerCreateSchema.safeParse({
      first_name: "Jane",
      last_name: "Doe",
      address_line1: "123 Main St",
      city: "Springfield",
      province_or_state: "IL",
      postal_or_zip: "62701",
      country_code: "US",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("property_address"))).toBe(true);
    }
  });

  it("fails creation with empty property_address string", () => {
    const res = customerCreateSchema.safeParse({
      first_name: "Jane",
      last_name: "Doe",
      address_line1: "123 Main St",
      city: "Springfield",
      province_or_state: "IL",
      postal_or_zip: "62701",
      country_code: "US",
      property_address: "   ",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("property_address"))).toBe(true);
    }
  });

  it("validates update with property_address", () => {
    const res = customerUpdateSchema.safeParse({
      property_address: "789 Pine Way",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.property_address).toBe("789 Pine Way");
    }
  });
});
