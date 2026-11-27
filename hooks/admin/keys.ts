export const adminKeys = {
  all: ["admin"] as const,
  organizations: (industryId?: string | null) =>
    [...adminKeys.all, "organizations", industryId ?? "all"] as const,
  industries: () => [...adminKeys.all, "industries"] as const,
  organizationRequests: (status?: string | null) =>
    [...adminKeys.all, "organization-requests", status ?? "all"] as const,
  organizationDomains: (organizationId?: string | null) =>
    [...adminKeys.all, "organization-domains", organizationId ?? "none"] as const,
  domains: (industryId?: string | null) =>
    [...adminKeys.all, "domains", industryId ?? "all"] as const,
  propertyIntelligenceSettings: () =>
    [...adminKeys.all, "property-intelligence", "settings"] as const,
  propertyIntelligenceProviders: () =>
    [...adminKeys.all, "property-intelligence", "providers"] as const,
  propertyIntelligenceCache: (q?: string | null) =>
    [...adminKeys.all, "property-intelligence", "cache", q ?? ""] as const,
  propertyIntelligenceUsage: () =>
    [...adminKeys.all, "property-intelligence", "usage"] as const,
  propertyIntelligenceRedisStatus: () =>
    [...adminKeys.all, "property-intelligence", "redis-status"] as const,
};
