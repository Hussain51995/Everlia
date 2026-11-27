import type {
  AreaMeasurement,
  ListingStatus,
  MoneyAmount,
  NormalizedPropertyType,
} from "@/lib/types/property-intelligence";

export function formatMoney(
  money: MoneyAmount | null | undefined,
  options?: { compact?: boolean }
): string | null {
  if (!money || money.amount == null || !Number.isFinite(money.amount)) {
    return null;
  }
  const currency = money.currency || "USD";
  if (options?.compact && Math.abs(money.amount) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(money.amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(money.amount);
}

export function formatArea(
  area: AreaMeasurement | null | undefined
): string | null {
  if (!area || area.value == null || !Number.isFinite(area.value)) return null;
  const unit = area.unit === "acre" ? (area.value === 1 ? "acre" : "acres") : "sq ft";
  return `${Math.round(area.value).toLocaleString("en-US")} ${unit}`;
}

export function formatPropertyType(
  type: NormalizedPropertyType | null | undefined
): string | null {
  if (!type || type === "unknown") return null;
  const labels: Record<NormalizedPropertyType, string> = {
    single_family: "Single family",
    condo: "Condo",
    townhouse: "Townhouse",
    multi_family: "Multi-family",
    manufactured: "Manufactured",
    apartment: "Apartment",
    land: "Land",
    other: "Other",
    unknown: "Unknown",
  };
  return labels[type] ?? null;
}

export function formatListingStatus(status: ListingStatus): string {
  const labels: Record<ListingStatus, string> = {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    sold: "Sold",
    unknown: "Status unknown",
  };
  return labels[status] ?? "Status unknown";
}

export function formatDistanceMiles(
  miles: number | null | undefined
): string | null {
  if (miles == null || !Number.isFinite(miles) || miles < 0) return null;
  if (miles < 0.1) return "Nearby";
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function formatDateLabel(
  iso: string | null | undefined
): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

export function formatBedsBaths(
  bedrooms: number | null | undefined,
  bathrooms: number | null | undefined
): string | null {
  const parts: string[] = [];
  if (bedrooms != null) parts.push(`${bedrooms} bed`);
  if (bathrooms != null) parts.push(`${bathrooms} bath`);
  return parts.length ? parts.join(" · ") : null;
}
