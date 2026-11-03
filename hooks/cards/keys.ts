export const cardKeys = {
  all: ["cards"] as const,
  list: (organizationId?: string | null) =>
    [...cardKeys.all, "list", organizationId ?? "none"] as const,
  detail: (id: string, organizationId?: string | null) =>
    [...cardKeys.all, "detail", organizationId ?? "none", id] as const,
  status: (id: string, organizationId?: string | null) =>
    [...cardKeys.all, "status", organizationId ?? "none", id] as const,
};

export const templateKeys = {
  all: ["templates"] as const,
  list: (organizationId?: string | null, extras?: string) =>
    [
      ...templateKeys.all,
      "list",
      organizationId ?? "none",
      extras ?? "",
    ] as const,
  detail: (id: string, organizationId?: string | null) =>
    [...templateKeys.all, "detail", organizationId ?? "none", id] as const,
};

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (organizationId?: string | null, extras?: string) =>
    [
      ...campaignKeys.all,
      "list",
      organizationId ?? "none",
      extras ?? "",
    ] as const,
  detail: (id: string, organizationId?: string | null) =>
    [...campaignKeys.all, "detail", organizationId ?? "none", id] as const,
  mailings: (id: string, organizationId?: string | null, scope?: string) =>
    [
      ...campaignKeys.all,
      "mailings",
      organizationId ?? "none",
      id,
      scope ?? "all",
    ] as const,
  activity: (id: string, organizationId?: string | null) =>
    [...campaignKeys.all, "activity", organizationId ?? "none", id] as const,
};

export const customerKeys = {
  all: ["customers"] as const,
  list: (organizationId?: string | null) =>
    [...customerKeys.all, "list", organizationId ?? "none"] as const,
  milestones: (customerId: string, organizationId?: string | null) =>
    [
      ...customerKeys.all,
      "milestones",
      organizationId ?? "none",
      customerId,
    ] as const,
};

export const occasionKeys = {
  all: ["occasions"] as const,
  list: (organizationId?: string | null, extras?: string) =>
    [...occasionKeys.all, "list", organizationId ?? "none", extras ?? ""] as const,
};

export const responseKeys = {
  all: ["responses"] as const,
  list: (organizationId?: string | null) =>
    [...responseKeys.all, "list", organizationId ?? "none"] as const,
};

export const orgScopedKeys = [
  cardKeys.all,
  templateKeys.all,
  customerKeys.all,
  responseKeys.all,
  campaignKeys.all,
  occasionKeys.all,
] as const;
