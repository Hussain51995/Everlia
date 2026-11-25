"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { adminKeys } from "@/hooks/admin/keys";
import type { AdminProviderStatus } from "@/lib/property-intelligence/admin/provider-catalog";
import type { PropertyIntelligenceResolvedConfig } from "@/lib/property-intelligence/settings/types";
import type {
  PropertyIntelligenceCacheInvalidateInput,
  PropertyIntelligenceCategorySettingsPatchInput,
  PropertyIntelligenceGlobalSettingsPatchInput,
} from "@/lib/validations/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export type PropertyIntelligenceSettingsResponse = {
  settings: PropertyIntelligenceResolvedConfig;
  providers: AdminProviderStatus[];
  envBudgetDefault: number;
  note: string;
};

export type PropertyIntelligenceCacheEntry = {
  id: string;
  cacheKey: string;
  providerId: string;
  providerDataset: string;
  category: PropertyDataCategory;
  normalizedIdentityKey: string;
  schemaVersion: number;
  accessScope: string;
  status: string;
  fetchedAt: string;
  expiresAt: string;
  sourceDataAt: string | null;
  invalidatedAt: string | null;
  updatedAt: string;
  isFresh: boolean;
  isNegative: boolean;
};

export type PropertyIntelligenceCacheResponse = {
  entries: PropertyIntelligenceCacheEntry[];
  count: number;
  note: string;
};

export type PropertyIntelligenceUsageResponse = {
  billingPeriod: string;
  configuredBudget: number;
  applicationLocal: {
    label: string;
    unitsReserved: number;
    unitsConsumed: number;
    remaining: number;
    counters: unknown[];
    successfulRequests: number;
    failedRequests: number;
    budgetBlockedRequests: number;
    skippedRequests: number;
    byProvider: Record<
      string,
      {
        reserved: number;
        consumed: number;
        succeeded: number;
        failed: number;
        budgetDenied: number;
      }
    >;
    byOperation: Record<
      string,
      { count: number; succeeded: number; failed: number }
    >;
  };
  measuredServerSide: Record<string, { available: boolean; note: string }>;
  notMeasuredServerSide: Record<string, { available: boolean; note: string }>;
  note: string;
};

export function usePropertyIntelligenceSettings() {
  return useQuery({
    queryKey: adminKeys.propertyIntelligenceSettings(),
    queryFn: () =>
      apiClient<PropertyIntelligenceSettingsResponse>(
        "/api/admin/property-intelligence/settings"
      ),
  });
}

export function usePropertyIntelligenceProviders() {
  return useQuery({
    queryKey: adminKeys.propertyIntelligenceProviders(),
    queryFn: () =>
      apiClient<{ providers: AdminProviderStatus[]; note: string }>(
        "/api/admin/property-intelligence/providers"
      ),
  });
}

export function useUpdatePropertyIntelligenceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      global?: PropertyIntelligenceGlobalSettingsPatchInput;
      category?: PropertyIntelligenceCategorySettingsPatchInput;
    }) =>
      apiClient<{ settings: PropertyIntelligenceResolvedConfig; note: string }>(
        "/api/admin/property-intelligence/settings",
        { method: "PATCH", body: input }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.propertyIntelligenceSettings(),
      });
      queryClient.invalidateQueries({
        queryKey: adminKeys.propertyIntelligenceUsage(),
      });
    },
  });
}

export function usePropertyIntelligenceCache(q?: string) {
  return useQuery({
    queryKey: adminKeys.propertyIntelligenceCache(q),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("q", q.trim());
      const qs = params.toString();
      return apiClient<PropertyIntelligenceCacheResponse>(
        `/api/admin/property-intelligence/cache${qs ? `?${qs}` : ""}`
      );
    },
  });
}

export function useInvalidatePropertyIntelligenceCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PropertyIntelligenceCacheInvalidateInput) =>
      apiClient<{
        invalidation: {
          scope: string;
          invalidatedCount: number;
          triggeredProviderFetch: false;
          at: string;
        };
        note: string;
      }>("/api/admin/property-intelligence/cache/invalidate", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "property-intelligence", "cache"],
      });
    },
  });
}

export function usePropertyIntelligenceUsage() {
  return useQuery({
    queryKey: adminKeys.propertyIntelligenceUsage(),
    queryFn: () =>
      apiClient<PropertyIntelligenceUsageResponse>(
        "/api/admin/property-intelligence/usage"
      ),
  });
}
