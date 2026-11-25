import { addressNormalizationService } from "@/lib/property-intelligence/address-normalization";
import type { PropertyIdentity } from "@/lib/types/property-intelligence";

export type CustomerPropertyFields = {
  property_address?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province_or_state?: string | null;
  postal_or_zip?: string | null;
};

export type ResolvedCustomerProperty =
  | {
      ok: true;
      address: string;
      identity: PropertyIdentity;
      aliasKey: string;
      zipCode: string | null;
    }
  | {
      ok: false;
      reason: "missing" | "invalid";
      message: string;
    };

export function resolveCustomerPropertyAddress(
  customer: CustomerPropertyFields
): ResolvedCustomerProperty {
  const raw = customer.property_address?.trim() ?? "";
  if (!raw) {
    return {
      ok: false,
      reason: "missing",
      message: "Customer property_address is missing",
    };
  }

  const normalized = addressNormalizationService.normalize(raw);
  if (!normalized.isUsable) {
    return {
      ok: false,
      reason: "invalid",
      message: "Customer property_address could not be normalized into a usable identity",
    };
  }

  return {
    ok: true,
    address: raw,
    identity: normalized.identity,
    aliasKey: normalized.aliasKey,
    zipCode:
      normalized.identity.components.postalCode ??
      addressNormalizationService.extractZip(raw),
  };
}

export function resolvePropertyFromCardCustomer(input: {
  customer: CustomerPropertyFields | null | undefined;
}): ResolvedCustomerProperty {
  if (!input.customer) {
    return {
      ok: false,
      reason: "missing",
      message: "Customer record not found for greeting card",
    };
  }
  return resolveCustomerPropertyAddress(input.customer);
}
