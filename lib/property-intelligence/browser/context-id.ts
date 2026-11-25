import { createHash } from "crypto";

export function buildResponseContextId(qrTokenRowId: string): string {
  return createHash("sha256")
    .update(`pi-response-ctx:v1:${qrTokenRowId}`)
    .digest("hex")
    .slice(0, 32);
}

export function buildPropertyIntelligenceEtag(input: {
  responseContextId: string;
  featureEnabled: boolean;
  browserCachingEnabled: boolean;
  globalConfigVersion: number;
  invalidationVersion: number;
  propertyIdentityKey: string | null;
  categoryFingerprint: string;
}): string {
  const material = [
    input.responseContextId,
    input.featureEnabled ? "1" : "0",
    input.browserCachingEnabled ? "1" : "0",
    String(input.globalConfigVersion),
    String(input.invalidationVersion),
    input.propertyIdentityKey ?? "",
    input.categoryFingerprint,
  ].join("|");
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `"pi-${hash}"`;
}
