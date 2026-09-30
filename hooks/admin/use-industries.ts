"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Industry } from "@/lib/types/auth";
import type {
  CreateIndustryInput,
  UpdateIndustryInput,
} from "@/lib/validations/auth";
import { adminKeys } from "@/hooks/admin/keys";

export type AdminIndustry = Industry & {
  is_active?: boolean;
  created_at?: string;
};

export function useAdminIndustries() {
  return useQuery({
    queryKey: adminKeys.industries(),
    queryFn: () => apiClient<AdminIndustry[]>("/api/admin/industries"),
  });
}

export function useCreateIndustry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateIndustryInput) =>
      apiClient<{
        industry: AdminIndustry;
        otherOrganization: { id: string; name: string; slug: string };
      }>("/api/admin/industries", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateIndustry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: UpdateIndustryInput & { id: string }) =>
      apiClient<{ industry: AdminIndustry }>(`/api/admin/industries/${id}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteIndustry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ deleted: boolean; industry: { id: string; name: string } }>(
        `/api/admin/industries/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
