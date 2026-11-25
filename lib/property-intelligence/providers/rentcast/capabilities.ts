import type {
  PropertyDataCategory,
  ProviderCapability,
} from "@/lib/types/property-intelligence";

const ATTRIBUTION =
  "Property data provided by RentCast. Estimates are not appraisals.";

const PUBLIC_DISPLAY = {
  allowed: true,
  notes:
    "Public QR display must use normalized domain models only; respect RentCast terms and attribution.",
} as const;

const BASE_RETENTION = {
  maxDatabaseTtlSeconds: null as number | null,
  notes:
    "Do not exceed RentCast contractual retention. Platform TTLs must remain configurable below any hard licensing cap.",
};

export const RENTCAST_CAPABILITIES: ProviderCapability[] = [
  {
    category: "property_details",
    supported: true,
    requiredInputs: ["address"],
    availableFields: [
      "identity",
      "specifications",
      "county",
      "lastSaleDate",
      "lastSalePrice",
    ],
    endpointCoverage: ["GET /v1/properties"],
    mayAlsoProvide: [],
    requestCostUnits: 1,
    retention: BASE_RETENTION,
    attribution: ATTRIBUTION,
    publicDisplay: PUBLIC_DISPLAY,
    accessScope: "public_qr",
  },
  {
    category: "property_valuation",
    supported: true,
    requiredInputs: ["address"],
    availableFields: [
      "estimate",
      "range",
      "subjectDetails",
      "comparables",
    ],
    endpointCoverage: ["GET /v1/avm/value"],
    mayAlsoProvide: ["property_details"],
    requestCostUnits: 1,
    retention: {
      ...BASE_RETENTION,
      notes:
        "AVM estimates change frequently; prefer shorter TTLs than property records.",
    },
    attribution: ATTRIBUTION,
    publicDisplay: PUBLIC_DISPLAY,
    accessScope: "public_qr",
  },
  {
    category: "nearby_houses",
    supported: true,
    requiredInputs: ["address"],
    availableFields: [
      "listings",
      "listPrice",
      "status",
      "specifications",
      "distanceMiles",
    ],
    endpointCoverage: ["GET /v1/listings/sale (residential property types)"],
    mayAlsoProvide: [],
    requestCostUnits: 1,
    retention: BASE_RETENTION,
    attribution: ATTRIBUTION,
    publicDisplay: {
      allowed: true,
      notes:
        "Do not expose listing agent/office contact fields. MLS numbers may be restricted by licensing.",
    },
    accessScope: "public_qr",
  },
  {
    category: "nearby_land",
    supported: true,
    requiredInputs: ["address"],
    availableFields: [
      "listings",
      "listPrice",
      "status",
      "lotSize",
      "distanceMiles",
    ],
    endpointCoverage: ["GET /v1/listings/sale (propertyType=Land)"],
    mayAlsoProvide: [],
    requestCostUnits: 1,
    retention: BASE_RETENTION,
    attribution: ATTRIBUTION,
    publicDisplay: PUBLIC_DISPLAY,
    accessScope: "public_qr",
  },
  {
    category: "market_statistics",
    supported: true,
    requiredInputs: ["zip_code"],
    availableFields: ["zipCode", "sale", "rental", "history"],
    endpointCoverage: ["GET /v1/markets"],
    mayAlsoProvide: [],
    requestCostUnits: 1,
    retention: BASE_RETENTION,
    attribution: ATTRIBUTION,
    publicDisplay: PUBLIC_DISPLAY,
    accessScope: "public_qr",
  },
];

export function getRentCastCapability(
  category: PropertyDataCategory
): ProviderCapability | null {
  return RENTCAST_CAPABILITIES.find((c) => c.category === category) ?? null;
}
