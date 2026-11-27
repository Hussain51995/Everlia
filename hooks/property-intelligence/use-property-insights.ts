"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { apiClient } from "@/lib/api/client";
import type { PropertyIntelligenceBootstrap } from "@/lib/property-intelligence/browser/types";
import type {
  PropertyCategoryResult,
  PropertyDataCategory,
  PropertyIntelligenceResult,
} from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import { getPropertyBrowserCacheService } from "@/hooks/property-intelligence/browser-cache-singleton";
import { propertyIntelligenceKeys } from "@/hooks/property-intelligence/keys";
import type { PublicRespondPayload } from "@/lib/types/cards";

export type PropertyInsightsViewModel = {
  featureEnabled: boolean;
  bootstrap: PropertyIntelligenceBootstrap | null;
  categories: PropertyIntelligenceResult["categories"] | null;
  loadingCategories: PropertyDataCategory[];
  browserPersistent: boolean;
};

type InsightsApiData = { insights: PropertyIntelligenceResult };

function emptyCategories(): PropertyIntelligenceResult["categories"] {
  const categories = {} as PropertyIntelligenceResult["categories"];
  for (const category of PROPERTY_DATA_CATEGORIES) {
    categories[category] = {
      category,
      status: "disabled",
      data: null,
      source: null,
      error: null,
      cache: null,
    };
  }
  return categories;
}

export function usePropertyInsights(input: {
  token: string;
  respond: PublicRespondPayload | undefined;
}) {
  const bootstrap = input.respond?.propertyIntelligence ?? null;
  const etagRef = useRef<string | null>(bootstrap?.etag ?? null);

  useEffect(() => {
    if (bootstrap?.etag) etagRef.current = bootstrap.etag;
  }, [bootstrap?.etag]);

  useEffect(() => {
    if (!bootstrap) return;
    let cancelled = false;
    (async () => {
      const cache = await getPropertyBrowserCacheService();
      cache.setBrowserCachingEnabled(bootstrap.browserCachingEnabled);
      if (!cancelled) {
        await cache.reconcileWithPolicy(
          bootstrap.responseContextId,
          bootstrap.cachePolicy,
          bootstrap.propertyIdentityKey
        );
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    bootstrap?.responseContextId,
    bootstrap?.globalConfigVersion,
    bootstrap?.invalidationVersion,
    bootstrap?.browserCachingEnabled,
    bootstrap?.propertyIdentityKey,
  ]);

  const enabledCategories = bootstrap?.enabledCategories ?? [];

  const query = useQuery({
    queryKey: propertyIntelligenceKeys.insights(
      bootstrap?.responseContextId ?? "none",
      bootstrap?.propertyIdentityKey ?? null,
      enabledCategories
    ),
    enabled: Boolean(
      input.respond &&
        bootstrap?.featureEnabled &&
        bootstrap.propertyIdentityKey &&
        enabledCategories.length > 0
    ),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<PropertyInsightsViewModel> => {
      const bi = bootstrap!;
      const cache = await getPropertyBrowserCacheService();
      cache.setBrowserCachingEnabled(bi.browserCachingEnabled);

      const merged = emptyCategories();
      const missing: PropertyDataCategory[] = [];

      if (!bi.browserCachingEnabled) {
        for (const category of enabledCategories) {
          missing.push(category);
        }
      } else {
        const parts = enabledCategories.map((category) => ({
          responseContextId: bi.responseContextId,
          propertyIdentityKey: bi.propertyIdentityKey!,
          category,
          providerId: bi.cachePolicy.categories[category].providerId,
        }));

        const lookups = await cache.getMany(parts, {
          schemaVersion: bi.schemaVersion,
          invalidationVersion: bi.invalidationVersion,
          propertyIdentityKey: bi.propertyIdentityKey!,
          categoryConfigVersions: Object.fromEntries(
            enabledCategories.map((c) => [
              c,
              bi.cachePolicy.categories[c].categoryConfigVersion,
            ])
          ) as Partial<Record<PropertyDataCategory, number>>,
        });

        for (const category of enabledCategories) {
          const catPolicy = bi.cachePolicy.categories[category];
          if (!catPolicy.enabled || !catPolicy.browserCachingAllowed) {
            merged[category] = {
              category,
              status: "disabled",
              data: null,
              source: null,
              error: null,
              cache: null,
            };
            continue;
          }

          const hit = lookups.get(category);
          if (hit?.status === "hit") {
            merged[category] = {
              category,
              status: "available",
              data: hit.record.data as never,
              source: {
                providerId: hit.record.providerId,
                providerDataset: null,
                category,
                retrievedAt: hit.record.providerFetchedAt,
                sourceDataAt: null,
                attribution: null,
                freshnessLabel: null,
                accessScope: "public_qr",
                schemaVersion: hit.record.schemaVersion,
                isMock: false,
                restrictions: [],
              },
              error: null,
              cache: {
                hit: true,
                serverCacheHit: false,
                fetchedAt: hit.record.providerFetchedAt,
                expiresAt: hit.record.browserExpiresAt,
                remainingTtlSeconds: hit.remainingTtlSeconds,
                isNegative: false,
                configVersion: hit.record.categoryConfigVersion,
              },
            };
          } else {
            missing.push(category);
            merged[category] = {
              category,
              status: "loading",
              data: null,
              source: null,
              error: null,
              cache: null,
            };
          }
        }
      }

      for (const category of PROPERTY_DATA_CATEGORIES) {
        if (!enabledCategories.includes(category)) {
          merged[category] = {
            category,
            status: "disabled",
            data: null,
            source: null,
            error: null,
            cache: null,
          };
        }
      }

      if (missing.length === 0) {
        return {
          featureEnabled: true,
          bootstrap: bi,
          categories: merged,
          loadingCategories: [],
          browserPersistent: true,
        };
      }

      const api = await apiClient<InsightsApiData>(
        `/api/respond/${input.token}/property-insights`,
        {
          method: "POST",
          body: { categories: missing },
        }
      );

      const insights = api.insights;

      for (const category of missing) {
        const result = insights.categories[category] as PropertyCategoryResult<unknown>;
        merged[category] = result as never;

        if (
          result.status === "available" &&
          result.data &&
          bi.browserCachingEnabled &&
          bi.cachePolicy.categories[category].browserCachingAllowed &&
          result.cache?.expiresAt &&
          result.cache.fetchedAt
        ) {
          await cache.set({
            responseContextId: bi.responseContextId,
            propertyIdentityKey: bi.propertyIdentityKey!,
            category,
            providerId: bi.cachePolicy.categories[category].providerId,
            schemaVersion: bi.schemaVersion,
            categoryConfigVersion:
              bi.cachePolicy.categories[category].categoryConfigVersion,
            invalidationVersion: bi.invalidationVersion,
            providerFetchedAt: result.cache.fetchedAt,
            sourceCacheExpiresAt: result.cache.expiresAt,
            browserTtlSeconds:
              bi.cachePolicy.categories[category].browserTtlSeconds,
            responseContextValidUntil: bi.responseContextValidUntil,
            data: result.data,
          });
        }
      }

      return {
        featureEnabled: insights.featureEnabled,
        bootstrap: bi,
        categories: merged,
        loadingCategories: [],
        browserPersistent: true,
      };
    },
  });

  return useMemo(
    () => ({
      ...query,
      bootstrap,
      featureEnabled: Boolean(bootstrap?.featureEnabled),
    }),
    [query, bootstrap]
  );
}
