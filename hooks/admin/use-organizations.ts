"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Organization } from "@/lib/types/auth";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/lib/validations/auth";
import { adminKeys } from "@/hooks/admin/keys";

export type AdminOrganization = Organization & {
  is_active?: boolean;
  created_at?: string;
  industry?: {
    id: string;
    name: string;
    slug: string;
    is_active?: boolean;
  } | null;
  domains?: Array<{
    id: string;
    domain: string;
    verification_status: string;
    verified_at: string | null;
  }> | null;
};

export function useAdminOrganizations(industryId?: string | null) {
  const query = industryId
    ? `/api/admin/organizations?industry_id=${encodeURIComponent(industryId)}`
    : "/api/admin/organizations";

  return useQuery({
    queryKey: adminKeys.organizations(industryId),
    queryFn: () => apiClient<AdminOrganization[]>(query),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      apiClient<{
        organization: AdminOrganization;
        domain: {
          id: string;
          domain: string;
          verification_status: string;
        } | null;
      }>("/api/admin/organizations", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: UpdateOrganizationInput & { id: string }) =>
      apiClient<{ organization: AdminOrganization }>(
        `/api/admin/organizations/${id}`,
        {
          method: "PATCH",
          body: input,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ deleted: boolean; organization: { id: string; name: string } }>(
        `/api/admin/organizations/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
