import type { CategoryResultStatus } from "@/lib/types/property-intelligence";

export function categoryStatusCopy(
  status: CategoryResultStatus
): { title: string; body: string } | null {
  switch (status) {
    case "loading":
      return {
        title: "Loading",
        body: "Gathering the latest available insights…",
      };
    case "missing":
      return {
        title: "No data yet",
        body: "We couldn’t find published details for this section right now.",
      };
    case "unavailable":
    case "expired":
      return {
        title: "Temporarily unavailable",
        body: "This insight isn’t available at the moment. Please check back later.",
      };
    case "unsupported":
      return {
        title: "Not available",
        body: "This type of insight isn’t offered for this property.",
      };
    case "budget_exhausted":
    case "rate_limited":
      return {
        title: "Temporarily unavailable",
        body: "Home insights are paused for now. Your greeting and reply still work as usual.",
      };
    case "error":
      return {
        title: "Couldn’t load",
        body: "Something went wrong loading this section. Please try again later.",
      };
    case "disabled":
    case "available":
      return null;
    default:
      return {
        title: "Unavailable",
        body: "This insight isn’t available right now.",
      };
  }
}

export function isEmptyAvailableData(
  status: CategoryResultStatus,
  data: unknown
): boolean {
  if (status !== "available") return false;
  if (data == null) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  return false;
}
