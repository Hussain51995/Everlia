export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  industries: () => ["industries"] as const,
  organizations: (industryId: string) =>
    ["organizations", industryId] as const,
};
