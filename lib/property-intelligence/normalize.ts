import type {
  AreaMeasurement,
  GeoCoordinates,
  ListingStatus,
  MoneyAmount,
  NormalizedPropertyType,
  PropertyAddressComponents,
  PropertyIdentity,
} from "@/lib/types/property-intelligence";

const UNIT_RE =
  /(?:^|[\s,])(?:apt\.?|apartment|suite|ste\.?|unit|#)\s*([a-z0-9-]+)\b/i;

export function normalizePropertyAddress(
  raw: string,
  countryCode = "US"
): PropertyIdentity {
  const trimmed = collapseWhitespace(raw ?? "");
  const unitMatch = trimmed.match(UNIT_RE);
  const unit = unitMatch?.[1] ? unitMatch[1].toUpperCase() : null;

  const withoutUnit = unitMatch
    ? collapseWhitespace(trimmed.replace(unitMatch[0], " ").replace(/,\s*,/g, ","))
    : trimmed;

  const parts = withoutUnit
    .split(",")
    .map((p) => collapseWhitespace(p))
    .filter(Boolean);

  let line1: string | null = parts[0] ?? null;
  let city: string | null = null;
  let adminArea: string | null = null;
  let postalCode: string | null = null;

  if (parts.length >= 2) {
    city = parts[1] ?? null;
  }
  if (parts.length >= 3) {
    const tail = parts.slice(2).join(" ");
    const stateZip = tail.match(/^([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?$/);
    const stateNameZip = tail.match(
      /^([A-Za-z][A-Za-z\s]+?)\s+(\d{5})(?:-\d{4})?$/
    );
    const zipOnly = tail.match(/^(\d{5})(?:-\d{4})?$/);
    const stateOnly = tail.match(/^([A-Za-z]{2})$/);
    if (stateZip) {
      adminArea = stateZip[1]!.toUpperCase();
      postalCode = stateZip[2]!;
    } else if (stateNameZip) {
      adminArea = stateNameZip[1]!.trim().toUpperCase();
      postalCode = stateNameZip[2]!;
    } else if (zipOnly) {
      postalCode = zipOnly[1]!;
    } else if (stateOnly) {
      adminArea = stateOnly[1]!.toUpperCase();
    } else {
      const maybeZip = tail.match(/\b(\d{5})(?:-\d{4})?\b/);
      const maybeAbbr = tail.match(/\b([A-Za-z]{2})\b/);
      if (maybeAbbr) adminArea = maybeAbbr[1]!.toUpperCase();
      if (maybeZip) postalCode = maybeZip[1]!;
    }
  }

  if (!postalCode) {
    const z = trimmed.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (z) postalCode = z[1]!;
  }

  if (line1) line1 = titleCaseStreet(line1);

  const components: PropertyAddressComponents = {
    formatted: trimmed || null,
    line1,
    line2: null,
    unit,
    city: city ? titleCaseWords(city) : null,
    adminArea,
    postalCode,
    countryCode: countryCode.toUpperCase(),
  };

  const keyParts = [
    (line1 ?? "").toUpperCase(),
    unit ? `UNIT:${unit}` : "",
    (city ?? "").toUpperCase(),
    adminArea ?? "",
    postalCode ?? "",
    components.countryCode,
  ].filter(Boolean);

  return {
    normalizedKey: keyParts.join("|") || "UNKNOWN",
    components,
    providerPropertyId: null,
    coordinates: null,
  };
}

export function normalizeMoney(
  amount: unknown,
  currency: "USD" = "USD"
): MoneyAmount | null {
  const n = toFiniteNumber(amount);
  if (n === null) return null;
  return { amount: n, currency };
}

export function normalizeAreaSqft(value: unknown): AreaMeasurement | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  return { value: n, unit: "sqft" };
}

export function normalizeCoordinates(
  latitude: unknown,
  longitude: unknown
): GeoCoordinates | null {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function normalizeListingStatus(raw: unknown): ListingStatus {
  if (typeof raw !== "string" || !raw.trim()) return "unknown";
  const v = raw.trim().toLowerCase();
  if (v === "active") return "active";
  if (v === "inactive") return "inactive";
  if (v === "pending") return "pending";
  if (v === "sold" || v === "closed") return "sold";
  return "unknown";
}

export function normalizePropertyType(raw: unknown): NormalizedPropertyType {
  if (typeof raw !== "string" || !raw.trim()) return "unknown";
  const v = raw.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (v.includes("single family") || v === "sfr") return "single_family";
  if (v.includes("condo")) return "condo";
  if (v.includes("townhouse") || v.includes("townhome")) return "townhouse";
  if (v.includes("multi family") || v.includes("multifamily")) return "multi_family";
  if (v.includes("manufactured") || v.includes("mobile")) return "manufactured";
  if (v.includes("apartment")) return "apartment";
  if (v === "land" || v.includes("vacant land") || v.includes("lot")) return "land";
  if (v.includes("other")) return "other";
  return "unknown";
}

export function normalizeIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function extractZipFromText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m?.[1] ?? null;
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseStreet(value: string): string {
  return value
    .split(" ")
    .map((w) => {
      if (/^\d/.test(w)) return w.toUpperCase();
      if (["N", "S", "E", "W", "NE", "NW", "SE", "SW"].includes(w.toUpperCase())) {
        return w.toUpperCase();
      }
      return titleCaseWords(w);
    })
    .join(" ");
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}
