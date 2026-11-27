import {
  extractZipFromText,
  normalizePropertyAddress,
} from "@/lib/property-intelligence/normalize";
import type {
  PropertyIdentity,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";

const STREET_SUFFIXES: Record<string, string> = {
  STREET: "ST",
  STR: "ST",
  AVENUE: "AVE",
  AVE: "AVE",
  BOULEVARD: "BLVD",
  BLVD: "BLVD",
  DRIVE: "DR",
  DR: "DR",
  ROAD: "RD",
  RD: "RD",
  LANE: "LN",
  LN: "LN",
  COURT: "CT",
  CT: "CT",
  PLACE: "PL",
  PL: "PL",
  CIRCLE: "CIR",
  CIR: "CIR",
  TERRACE: "TER",
  TER: "TER",
  HIGHWAY: "HWY",
  HWY: "HWY",
  PARKWAY: "PKWY",
  PKWY: "PKWY",
  WAY: "WAY",
};

const STATE_NAME_TO_ABBR: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
};

export type AddressNormalizationResult = {
  identity: PropertyIdentity;
  aliasKey: string;
  isUsable: boolean;
  reason?: "empty" | "insufficient";
};

export class AddressNormalizationService {
  normalize(raw: string, countryCode = "US"): AddressNormalizationResult {
    const trimmed = (raw ?? "").replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return {
        identity: normalizePropertyAddress("", countryCode),
        aliasKey: "empty",
        isUsable: false,
        reason: "empty",
      };
    }

    const base = normalizePropertyAddress(trimmed, countryCode);
    const line1 = normalizeStreetLine(base.components.line1);
    const adminArea = normalizeAdminArea(base.components.adminArea);
    const postalCode = normalizePostal(base.components.postalCode);
    const city = base.components.city
      ? base.components.city.toUpperCase()
      : null;
    const unit = base.components.unit;

    const keyParts = [
      (line1 ?? "").toUpperCase(),
      unit ? `UNIT:${unit}` : "",
      city ?? "",
      adminArea ?? "",
      postalCode ?? "",
      countryCode.toUpperCase(),
    ].filter(Boolean);

    const identity: PropertyIdentity = {
      normalizedKey: keyParts.join("|") || "UNKNOWN",
      components: {
        ...base.components,
        line1: line1 ? toDisplayStreet(line1) : null,
        adminArea,
        postalCode,
        countryCode: countryCode.toUpperCase(),
      },
      providerPropertyId: base.providerPropertyId,
      coordinates: base.coordinates,
    };

    const isUsable = Boolean(
      identity.normalizedKey !== "UNKNOWN" &&
        (identity.components.line1 || identity.components.postalCode)
    );

    return {
      identity,
      aliasKey: buildAliasKey(trimmed),
      isUsable,
      reason: isUsable ? undefined : "insufficient",
    };
  }

  withProviderCanonical(
    identity: PropertyIdentity,
    options: {
      formattedAddress?: string | null;
      providerPropertyId?: string | null;
      providerId?: PropertyProviderId;
    }
  ): PropertyIdentity {
    const next = { ...identity, components: { ...identity.components } };
    if (options.providerPropertyId) {
      next.providerPropertyId = options.providerPropertyId;
    }
    if (options.formattedAddress?.trim()) {
      next.components.formatted = options.formattedAddress.trim();
    }
    return next;
  }

  areEquivalent(a: string, b: string): boolean {
    const left = this.normalize(a);
    const right = this.normalize(b);
    if (!left.isUsable || !right.isUsable) return false;
    return left.identity.normalizedKey === right.identity.normalizedKey;
  }

  extractZip(raw: string | null | undefined): string | null {
    return extractZipFromText(raw) ?? null;
  }
}

export const addressNormalizationService = new AddressNormalizationService();

export function buildAliasKey(raw: string): string {
  return raw
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStreetLine(line1: string | null): string | null {
  if (!line1) return null;
  const tokens = line1
    .toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  if (tokens.length === 0) return null;

  const last = tokens[tokens.length - 1]!;
  const mapped = STREET_SUFFIXES[last];
  if (mapped) {
    tokens[tokens.length - 1] = mapped;
  }

  return tokens.join(" ");
}

function toDisplayStreet(normalizedLine1: string): string {
  return normalizedLine1
    .toLowerCase()
    .split(" ")
    .map((w) => {
      if (/^\d/.test(w)) return w.toUpperCase();
      if (["N", "S", "E", "W", "NE", "NW", "SE", "SW", "ST", "AVE", "BLVD", "DR", "RD", "LN", "CT", "PL", "CIR", "TER", "HWY", "PKWY"].includes(w.toUpperCase())) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function normalizeAdminArea(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  return STATE_NAME_TO_ABBR[trimmed] ?? trimmed;
}

function normalizePostal(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{5})(?:-\d{4})?$/);
  return m?.[1] ?? value.replace(/\s+/g, "").toUpperCase();
}
