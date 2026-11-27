import { createHash } from "crypto";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import type { BuiltCacheKey } from "@/lib/property-intelligence/cache/types";
import type {
  BuildRedisStorageKeyInput,
  RedisCacheEnvironment,
} from "@/lib/property-intelligence/cache/provider/types";

export function buildPropertyQueryHash(input: {
  normalizedIdentityKey: string;
  requestParamsFingerprint: string;
  providerDataset?: string | null;
  invalidationGeneration?: number;
}): string {
  const material = [
    input.providerDataset ?? "-",
    input.normalizedIdentityKey,
    input.requestParamsFingerprint,
    String(Math.max(0, Math.floor(input.invalidationGeneration ?? 0))),
  ].join("|");
  return createHash("sha256").update(material).digest("hex").slice(0, 40);
}

export function buildRedisStorageKey(input: BuildRedisStorageKeyInput): string {
  const environment = sanitizeSegment(input.environment, "development");
  const provider = sanitizeSegment(input.providerId, "unknown");
  const scope = sanitizeSegment(input.accessScope, "public_qr");
  const category = sanitizeSegment(input.category, "unknown");
  const queryHash = sanitizeSegment(input.queryHash, "0".repeat(40));
  const schemaVersion = Math.max(1, Math.floor(input.schemaVersion));

  return [
    "everlia",
    "property",
    environment,
    String(schemaVersion),
    provider,
    scope,
    category,
    queryHash,
  ].join(":");
}

export function redisStorageKeyFromBuiltCacheKey(input: {
  key: BuiltCacheKey;
  providerId: string;
  category: PropertyDataCategory;
  environment: RedisCacheEnvironment | string;
  invalidationGeneration?: number;
}): string {
  const queryHash = buildPropertyQueryHash({
    normalizedIdentityKey: input.key.normalizedIdentityKey,
    requestParamsFingerprint: input.key.requestParamsFingerprint,
    providerDataset: input.key.providerDataset,
    invalidationGeneration: input.invalidationGeneration,
  });

  return buildRedisStorageKey({
    environment: input.environment,
    schemaVersion: input.key.schemaVersion,
    providerId: input.providerId,
    providerDataset: input.key.providerDataset,
    accessScope: input.key.accessScope,
    category: input.category,
    queryHash,
    invalidationGeneration: input.invalidationGeneration,
  });
}

function sanitizeSegment(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 128);
}
