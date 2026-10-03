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
  list: (organizationId?: string | null) =>
    [...templateKeys.all, "list", organizationId ?? "none"] as const,
  detail: (id: string, organizationId?: string | null) =>
    [...templateKeys.all, "detail", organizationId ?? "none", id] as const,
};

export const customerKeys = {
  all: ["customers"] as const,
  list: (organizationId?: string | null) =>
    [...customerKeys.all, "list", organizationId ?? "none"] as const,
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
] as const;
