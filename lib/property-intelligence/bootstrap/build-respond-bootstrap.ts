import {
  buildPropertyIntelligenceEtag,
  buildResponseContextId,
} from "@/lib/property-intelligence/browser/context-id";
import {
  BROWSER_CACHE_SCHEMA_VERSION,
  type BrowserCachePolicySnapshot,
  type PropertyIntelligenceBootstrap,
} from "@/lib/property-intelligence/browser/types";
import { resolveCustomerPropertyAddress } from "@/lib/property-intelligence/customer-property";
import type { PropertyIntelligenceResolvedConfig } from "@/lib/property-intelligence/settings/types";
import type { CustomerPropertyFields } from "@/lib/property-intelligence/customer-property";
import {
  PROPERTY_DATA_CATEGORIES,
  type PropertyDataCategory,
} from "@/lib/types/property-intelligence";

export type BuildRespondBootstrapInput = {
  qrTokenRowId: string;
  customer: CustomerPropertyFields;
  config: PropertyIntelligenceResolvedConfig;
  browserCachingAllowedByCategory?: Partial<
    Record<PropertyDataCategory, boolean>
  >;
  responseContextValidUntil?: string | null;
};

export function buildPropertyIntelligenceBootstrap(
  input: BuildRespondBootstrapInput
): PropertyIntelligenceBootstrap {
  const responseContextId = buildResponseContextId(input.qrTokenRowId);
  const resolved = resolveCustomerPropertyAddress(input.customer);

  const propertyIdentityKey = resolved.ok
    ? resolved.identity.normalizedKey
    : null;
  const propertyDisplayHint = resolved.ok ? resolved.address : null;

  const categories = {} as BrowserCachePolicySnapshot["categories"];
  const enabledCategories: PropertyDataCategory[] = [];
  const fingerprintParts: string[] = [];

  for (const category of PROPERTY_DATA_CATEGORIES) {
    const settings = input.config.categories[category];
    const browserCachingAllowed =
      input.browserCachingAllowedByCategory?.[category] ?? true;
    categories[category] = {
      enabled: settings.enabled,
      providerId: settings.providerId,
      browserTtlSeconds: settings.browserTtlSeconds,
      categoryConfigVersion: settings.configVersion,
      browserCachingAllowed,
    };
    fingerprintParts.push(
      `${category}:${settings.enabled ? 1 : 0}:${settings.providerId}:${settings.configVersion}:${settings.browserTtlSeconds}:${browserCachingAllowed ? 1 : 0}`
    );
    if (settings.enabled && input.config.global.featureEnabled) {
      enabledCategories.push(category);
    }
  }

  const invalidationVersion = input.config.global.configVersion;
  const etag = buildPropertyIntelligenceEtag({
    responseContextId,
    featureEnabled: input.config.global.featureEnabled,
    browserCachingEnabled: input.config.global.browserCachingEnabled,
    globalConfigVersion: input.config.global.configVersion,
    invalidationVersion,
    propertyIdentityKey,
    categoryFingerprint: fingerprintParts.join(";"),
  });

  return {
    featureEnabled: input.config.global.featureEnabled,
    browserCachingEnabled: input.config.global.browserCachingEnabled,
    responseContextId,
    propertyIdentityKey,
    propertyDisplayHint,
    schemaVersion: BROWSER_CACHE_SCHEMA_VERSION,
    globalConfigVersion: input.config.global.configVersion,
    invalidationVersion,
    etag,
    responseContextValidUntil: input.responseContextValidUntil ?? null,
    cachePolicy: {
      browserCachingEnabled: input.config.global.browserCachingEnabled,
      globalConfigVersion: input.config.global.configVersion,
      invalidationVersion,
      schemaVersion: BROWSER_CACHE_SCHEMA_VERSION,
      categories,
    },
    enabledCategories,
  };
}
