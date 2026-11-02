export const adminKeys = {
  all: ["admin"] as const,
  organizations: (industryId?: string | null) =>
    [...adminKeys.all, "organizations", industryId ?? "all"] as const,
  industries: () => [...adminKeys.all, "industries"] as const,
  organizationRequests: (status?: string | null) =>
    [...adminKeys.all, "organization-requests", status ?? "all"] as const,
  organizationDomains: (organizationId?: string | null) =>
    [...adminKeys.all, "organization-domains", organizationId ?? "none"] as const,
};
