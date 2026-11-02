"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Organization } from "@/lib/types/auth";
import { adminKeys } from "@/hooks/admin/keys";

export type AdminOrganizationRequest = {
  id: string;
  industry_id: string;
  requesting_user_id: string;
  requested_name: string;
  requested_domain: string | null;
  requested_workspace_type: string;
  status: "pending" | "approved" | "rejected" | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_organization_id: string | null;
  review_notes: string | null;
  business_details?: Record<string, unknown> | null;
  created_at?: string;
  industry?: { id: string; name: string; slug: string } | null;
};

export function useAdminOrganizationRequests(status?: string | null) {
  const query = status
    ? `/api/admin/organization-requests?status=${encodeURIComponent(status)}`
    : "/api/admin/organization-requests";

  return useQuery({
    queryKey: adminKeys.organizationRequests(status),
    queryFn: () => apiClient<AdminOrganizationRequest[]>(query),
  });
}

export function useApproveOrganizationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ organization: Organization }>(
        `/api/admin/organization-requests/${id}/approve`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useRejectOrganizationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient<{ request: AdminOrganizationRequest }>(
        `/api/admin/organization-requests/${id}/reject`,
        {
          method: "POST",
          body: notes ? { notes } : {},
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useAdminOrganizationDomains(organizationId: string | null) {
  return useQuery({
    queryKey: adminKeys.organizationDomains(organizationId),
    enabled: Boolean(organizationId),
    queryFn: () =>
      apiClient<
        Array<{
          id: string;
          organization_id: string;
          domain: string;
          verification_status: string;
          verification_method: string | null;
          verified_at: string | null;
          txt_record_host: string | null;
          txt_record_value: string | null;
        }>
      >(`/api/admin/organizations/${organizationId}/domains`),
  });
}

export function useAdminVerifyDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      domain,
      markVerified,
    }: {
      organizationId: string;
      domain: string;
      markVerified?: boolean;
    }) =>
      apiClient<{
        domain: unknown;
        challenge: { host: string; value: string; instructions: string } | null;
        adminVerified: boolean;
      }>(`/api/admin/organizations/${organizationId}/domains`, {
        method: "POST",
        body: { domain, markVerified: markVerified ?? true },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export type AdminDomainSummary = {
  domain: string;
  verificationStatuses: string[];
  organizationCount: number;
  organizations: Array<{
    id: string;
    name: string;
    industryId: string | null;
    isActive: boolean;
  }>;
};

export function useAdminDomains(industryId?: string | null) {
  const params = new URLSearchParams();
  params.set("status", "all");
  if (industryId) params.set("industry_id", industryId);
  const query = `/api/admin/domains?${params.toString()}`;

  return useQuery({
    queryKey: adminKeys.domains(industryId),
    queryFn: () =>
      apiClient<{ domains: AdminDomainSummary[]; rows: unknown[] }>(query),
  });
}
