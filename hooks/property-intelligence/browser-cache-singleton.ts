"use client";

import { createBrowserCacheService } from "@/lib/property-intelligence/browser/cache-service";
import type { PropertyBrowserCacheService } from "@/lib/property-intelligence/browser/cache-service";
import { createBrowserCacheTelemetry } from "@/lib/property-intelligence/browser/telemetry";
import { getDefaultBrowserCacheStorage } from "@/lib/property-intelligence/browser/storage";

let servicePromise: Promise<PropertyBrowserCacheService> | null = null;

export async function getPropertyBrowserCacheService(): Promise<PropertyBrowserCacheService> {
  if (!servicePromise) {
    servicePromise = (async () => {
      const { storage } = await getDefaultBrowserCacheStorage();
      const telemetry = createBrowserCacheTelemetry({
        sampleRate:
          typeof process !== "undefined" && process.env.NODE_ENV === "test"
            ? 1
            : 0.25,
      });
      const service = createBrowserCacheService({ storage, telemetry });
      // Best-effort bounded cleanup on first access.
      void service.cleanupExpired({ limit: 40 }).catch(() => undefined);
      void service
        .invalidateIncompatibleSchema()
        .catch(() => undefined);
      return service;
    })();
  }
  return servicePromise;
}

export function resetPropertyBrowserCacheServiceSingleton() {
  servicePromise = null;
}
