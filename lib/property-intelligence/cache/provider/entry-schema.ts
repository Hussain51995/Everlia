import { z } from "zod";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import { assertSafeCachePayload } from "@/lib/property-intelligence/cache/freshness";
import {
  PROPERTY_CACHE_ENTRY_ENVELOPE_VERSION,
  type PropertyCacheEntry,
} from "@/lib/property-intelligence/cache/provider/types";
import { CacheProviderError } from "@/lib/property-intelligence/cache/provider/errors";

const isoTimestampSchema = z
  .string()
  .min(1)
  .refine((v) => Number.isFinite(Date.parse(v)), {
    message: "Invalid ISO timestamp",
  });

const negativePayloadSchema = z.object({
  kind: z.literal("negative"),
  reason: z.enum(["not_found", "empty"]),
  message: z.string().max(500).optional(),
});

const positivePayloadSchema = z
  .record(z.string(), z.unknown())
  .superRefine((val, ctx) => {
    try {
      assertSafeCachePayload(val);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Unsafe cache payload",
      });
    }
  });

export const propertyCacheEntrySchema = z
  .object({
    envelopeVersion: z.number().int().min(1),
    providerId: z.string().min(1).max(64),
    providerDataset: z.string().min(1).max(128).nullable(),
    category: z.enum(PROPERTY_DATA_CATEGORIES),
    schemaVersion: z.number().int().min(1),
    normalizedIdentityKey: z.string().min(1).max(500),
    requestParamsFingerprint: z.string().min(1).max(128),
    accessScope: z.string().min(1).max(64),
    fetchedAt: isoTimestampSchema,
    sourceDataAt: isoTimestampSchema.nullable(),
    expiresAt: isoTimestampSchema,
    invalidationGeneration: z.number().int().min(0),
    payload: z.union([negativePayloadSchema, positivePayloadSchema]),
  })
  .superRefine((val, ctx) => {
    const fetched = Date.parse(val.fetchedAt);
    const expires = Date.parse(val.expiresAt);
    if (!(expires > fetched)) {
      ctx.addIssue({
        code: "custom",
        message: "expiresAt must be after fetchedAt",
        path: ["expiresAt"],
      });
    }
  });

export type PropertyCacheEntryParsed = z.infer<typeof propertyCacheEntrySchema>;

export function parsePropertyCacheEntry(raw: unknown): PropertyCacheEntry {
  const parsed = propertyCacheEntrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new CacheProviderError({
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid cache entry",
      retryable: false,
    });
  }
  return parsed.data as PropertyCacheEntry;
}

export function serializePropertyCacheEntry(entry: PropertyCacheEntry): string {
  try {
    assertSafeCachePayload(entry.payload);
    const normalized: PropertyCacheEntry = {
      ...entry,
      envelopeVersion:
        entry.envelopeVersion || PROPERTY_CACHE_ENTRY_ENVELOPE_VERSION,
      providerDataset: entry.providerDataset ?? null,
      sourceDataAt: entry.sourceDataAt ?? null,
      invalidationGeneration: Math.max(0, Math.floor(entry.invalidationGeneration)),
    };
    parsePropertyCacheEntry(normalized);
    return JSON.stringify(normalized);
  } catch (error) {
    if (error instanceof CacheProviderError) throw error;
    throw new CacheProviderError({
      code: "serialization_failed",
      message:
        error instanceof Error
          ? error.message
          : "Failed to serialize cache entry",
      retryable: false,
      cause: error,
    });
  }
}

export function deserializePropertyCacheEntry(raw: unknown): PropertyCacheEntry {
  try {
    if (raw == null) {
      throw new CacheProviderError({
        code: "validation_failed",
        message: "Empty cache value",
        retryable: false,
      });
    }
    const value =
      typeof raw === "string"
        ? (JSON.parse(raw) as unknown)
        : (raw as unknown);
    return parsePropertyCacheEntry(value);
  } catch (error) {
    if (error instanceof CacheProviderError) throw error;
    if (error instanceof SyntaxError) {
      throw new CacheProviderError({
        code: "serialization_failed",
        message: "Invalid JSON in cache entry",
        retryable: false,
        cause: error,
      });
    }
    throw new CacheProviderError({
      code: "validation_failed",
      message:
        error instanceof Error
          ? error.message
          : "Failed to deserialize cache entry",
      retryable: false,
      cause: error,
    });
  }
}

export function createPropertyCacheEntry(
  input: Omit<PropertyCacheEntry, "envelopeVersion"> & {
    envelopeVersion?: number;
  }
): PropertyCacheEntry {
  const entry: PropertyCacheEntry = {
    envelopeVersion:
      input.envelopeVersion ?? PROPERTY_CACHE_ENTRY_ENVELOPE_VERSION,
    providerId: input.providerId,
    providerDataset: input.providerDataset ?? null,
    category: input.category,
    schemaVersion: input.schemaVersion,
    normalizedIdentityKey: input.normalizedIdentityKey,
    requestParamsFingerprint: input.requestParamsFingerprint,
    accessScope: input.accessScope,
    fetchedAt: input.fetchedAt,
    sourceDataAt: input.sourceDataAt ?? null,
    expiresAt: input.expiresAt,
    invalidationGeneration: Math.max(
      0,
      Math.floor(input.invalidationGeneration)
    ),
    payload: input.payload,
  };
  return parsePropertyCacheEntry(entry);
}
