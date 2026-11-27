import { normalizePropertyAddress } from "@/lib/property-intelligence/normalize";
import type { NearbyListingsQuery, PropertyLookup } from "@/lib/types/property-intelligence";

export function makeLookup(
  address = "5500 Grand Lake Dr, San Antonio, TX 78244"
): PropertyLookup {
  const identity = normalizePropertyAddress(address);
  return {
    address,
    identity,
    zipCode: identity.components.postalCode,
    organizationId: null,
    customerId: null,
  };
}

export function defaultResidentialQuery(): NearbyListingsQuery {
  return {
    kind: "residential",
    radiusMiles: 1,
    limit: 10,
    status: "active",
  };
}

export function defaultLandQuery(): NearbyListingsQuery {
  return {
    kind: "land",
    radiusMiles: 5,
    limit: 10,
    status: "active",
  };
}
