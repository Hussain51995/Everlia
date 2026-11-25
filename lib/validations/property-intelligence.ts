import { z } from "zod";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

export const propertyInsightsRequestSchema = z.object({
  categories: z
    .array(z.enum(PROPERTY_DATA_CATEGORIES))
    .max(PROPERTY_DATA_CATEGORIES.length)
    .optional(),
});

export type PropertyInsightsRequestInput = z.infer<
  typeof propertyInsightsRequestSchema
>;

export const propertyIntelligenceCacheInvalidateSchema = z.discriminatedUnion(
  "scope",
  [
    z.object({
      scope: z.literal("property"),
      normalizedIdentityKey: z.string().min(1).max(500),
    }),
    z.object({
      scope: z.literal("category"),
      category: z.enum(PROPERTY_DATA_CATEGORIES),
      normalizedIdentityKey: z.string().min(1).max(500).optional().nullable(),
    }),
    z.object({
      scope: z.literal("zip"),
      countryCode: z.string().min(2).max(2),
      zipCode: z.string().min(3).max(16),
    }),
    z.object({
      scope: z.literal("provider"),
      providerId: z.string().min(1).max(64),
    }),
    z.object({
      scope: z.literal("all"),
    }),
  ]
);

export type PropertyIntelligenceCacheInvalidateInput = z.infer<
  typeof propertyIntelligenceCacheInvalidateSchema
>;

export const propertyIntelligenceGlobalSettingsPatchSchema = z.object({
  featureEnabled: z.boolean().optional(),
  browserCachingEnabled: z.boolean().optional(),
  defaultProviderId: z.string().min(1).max(64).optional(),
  monthlyApiBudget: z.number().int().min(0).max(1_000_000).optional(),
});

export const propertyIntelligenceCategorySettingsPatchSchema = z
  .object({
    category: z.enum(PROPERTY_DATA_CATEGORIES),
    enabled: z.boolean().optional(),
    providerId: z.string().min(1).max(64).optional(),
    browserTtlSeconds: z.number().int().min(1).max(63072000).optional(),
    databaseTtlSeconds: z.number().int().min(1).max(63072000).optional(),
    searchRadiusMiles: z.number().positive().max(100).nullable().optional(),
    listingLimit: z.number().int().min(1).max(100).nullable().optional(),
    queryFilters: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.browserTtlSeconds != null &&
      val.databaseTtlSeconds != null &&
      val.browserTtlSeconds > val.databaseTtlSeconds
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Browser TTL must not exceed database TTL",
        path: ["browserTtlSeconds"],
      });
    }
  });

export const propertyIntelligenceCacheSearchSchema = z.object({
  q: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type PropertyIntelligenceGlobalSettingsPatchInput = z.infer<
  typeof propertyIntelligenceGlobalSettingsPatchSchema
>;
export type PropertyIntelligenceCategorySettingsPatchInput = z.infer<
  typeof propertyIntelligenceCategorySettingsPatchSchema
>;
