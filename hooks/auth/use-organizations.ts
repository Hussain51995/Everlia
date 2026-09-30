"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Organization } from "@/lib/types/auth";
import { authKeys } from "@/hooks/auth/keys";

export function useOrganizations(industryId: string | null) {
  return useQuery({
    queryKey: authKeys.organizations(industryId ?? "none"),
    queryFn: () =>
      apiClient<Organization[]>(
        `/api/organizations?industry_id=${encodeURIComponent(industryId!)}`
      ),
    enabled: Boolean(industryId),
  });
}
