import type { GreetingCardStatus } from "@/lib/types/cards";

const POSTGRID_STATUS_MAP: Record<string, GreetingCardStatus> = {
  ready: "processing",
  printing: "processing",
  processed_for_delivery: "processing",
  completed: "mailed",
  mailed: "mailed",
  in_transit: "mailed",
  in_local_area: "mailed",
  processed_for_delivery_local: "mailed",
  delivered: "delivered",
  returned_to_sender: "mailed",
  cancelled: "draft",
};

const LOB_STATUS_MAP: Record<string, GreetingCardStatus> = {
  processed: "processing",
  rendered: "processing",
  printed: "processing",
  mailed: "mailed",
  in_transit: "mailed",
  in_local_area: "mailed",
  processed_for_delivery: "mailed",
  delivered: "delivered",
  returned_to_sender: "mailed",
  cancelled: "draft",
};

export function mapProviderStatus(
  providerSlug: string,
  providerStatus: string
): GreetingCardStatus {
  const normalized = providerStatus.trim().toLowerCase().replace(/\s+/g, "_");

  if (providerSlug === "postgrid") {
    return POSTGRID_STATUS_MAP[normalized] ?? "processing";
  }

  if (providerSlug === "lob") {
    return LOB_STATUS_MAP[normalized] ?? "processing";
  }

  return "processing";
}

export function shouldAdvanceCardStatus(
  current: GreetingCardStatus,
  next: GreetingCardStatus
): boolean {
  const order: GreetingCardStatus[] = [
    "draft",
    "ready_to_send",
    "submitted",
    "processing",
    "mailed",
    "delivered",
    "qr_scanned",
    "response_received",
  ];

  if (next === "draft" && current !== "draft") {
    return false;
  }

  const currentIdx = order.indexOf(current);
  const nextIdx = order.indexOf(next);

  if (currentIdx < 0 || nextIdx < 0) return false;
  return nextIdx >= currentIdx;
}
