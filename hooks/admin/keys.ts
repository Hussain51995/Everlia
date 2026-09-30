export const adminKeys = {
  all: ["admin"] as const,
  organizations: (industryId?: string | null) =>
    [...adminKeys.all, "organizations", industryId ?? "all"] as const,
  industries: () => [...adminKeys.all, "industries"] as const,
};
