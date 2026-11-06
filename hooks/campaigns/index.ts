"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  campaignKeys,
  customerKeys,
  occasionKeys,
  templateKeys,
} from "@/hooks/cards/keys";
import { useAuthStore } from "@/stores/auth-store";
import type { CustomerMilestone } from "@/lib/types/cards";
import type { CardTemplate } from "@/lib/types/cards";
import type {
  Campaign,
  CampaignAuditEvent,
  CampaignDetail,
  CampaignListItem,
  CampaignMailing,
} from "@/lib/types/campaigns";
import type { OccasionDefinition } from "@/lib/campaigns/occasions";
import type {
  CampaignCreateInput,
  CampaignExtendInput,
  CampaignSchedulePreviewInput,
  CampaignUpdateInput,
  CustomerMilestoneCreateInput,
  CustomerMilestoneUpdateInput,
} from "@/lib/validations/campaigns";

function useActiveOrgId() {
  return useAuthStore((state) => state.activeOrganizationId);
}

export function useOccasions(options?: {
  defaultsOnly?: boolean;
  category?: string;
}) {
  const organizationId = useActiveOrgId();
  const extras = [
    options?.defaultsOnly ? "defaults" : "all",
    options?.category ?? "",
  ].join(":");

  return useQuery({
    queryKey: occasionKeys.list(organizationId, extras),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.defaultsOnly) params.set("defaults", "1");
      if (options?.category) params.set("category", options.category);
      const qs = params.toString();
      const data = await apiClient<{
        occasions: OccasionDefinition[];
        source: string;
      }>(`/api/occasions${qs ? `?${qs}` : ""}`);
      return data.occasions;
    },
  });
}

export function useCampaignEligibleTemplates() {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: templateKeys.list(organizationId, "campaignEligible"),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ templates: CardTemplate[] }>(
        "/api/templates?campaignEligible=1"
      );
      return data.templates;
    },
  });
}

export function useCustomerMilestones(customerId: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: customerKeys.milestones(customerId ?? "", organizationId),
    enabled: Boolean(customerId) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ milestones: CustomerMilestone[] }>(
        `/api/customers/${customerId}/milestones`
      );
      return data.milestones;
    },
  });
}

export function useCreateCustomerMilestone(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerMilestoneCreateInput) =>
      apiClient<{ milestone: CustomerMilestone }>(
        `/api/customers/${customerId}/milestones`,
        { method: "POST", body: input }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomerMilestone(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      milestoneId,
      ...input
    }: CustomerMilestoneUpdateInput & { milestoneId: string }) =>
      apiClient<{ milestone: CustomerMilestone }>(
        `/api/customers/${customerId}/milestones/${milestoneId}`,
        { method: "PATCH", body: input }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useDeleteCustomerMilestone(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) =>
      apiClient<{ deleted: boolean }>(
        `/api/customers/${customerId}/milestones/${milestoneId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useCampaignSchedulePreview() {
  return useMutation({
    mutationFn: (input: CampaignSchedulePreviewInput) =>
      apiClient<{
        upcomingOccasions: unknown[];
        eligibleCustomerIds: string[];
        skipped: unknown[];
        expectedCardCount: number;
        summary: Record<string, number>;
      }>("/api/campaigns/schedule-preview", {
        method: "POST",
        body: input,
      }),
  });
}

export function useCampaigns(options?: { status?: string; q?: string }) {
  const organizationId = useActiveOrgId();
  const extras = [options?.status ?? "", options?.q ?? ""].join(":");
  return useQuery({
    queryKey: campaignKeys.list(organizationId, extras),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.set("status", options.status);
      if (options?.q) params.set("q", options.q);
      const qs = params.toString();
      const data = await apiClient<{ campaigns: CampaignListItem[] }>(
        `/api/campaigns${qs ? `?${qs}` : ""}`
      );
      return data.campaigns;
    },
  });
}

export function useCampaign(id: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: campaignKeys.detail(id ?? "", organizationId),
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ campaign: CampaignDetail }>(
        `/api/campaigns/${id}`
      );
      return data.campaign;
    },
  });
}

export function useCampaignMailings(
  id: string | null,
  scope: "upcoming" | "history" | "all" = "all"
) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: campaignKeys.mailings(id ?? "", organizationId, scope),
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ mailings: CampaignMailing[] }>(
        `/api/campaigns/${id}/mailings?scope=${scope}`
      );
      return data.mailings;
    },
  });
}

export function useCampaignActivity(id: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: campaignKeys.activity(id ?? "", organizationId),
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ events: CampaignAuditEvent[] }>(
        `/api/campaigns/${id}/activity`
      );
      return data.events;
    },
  });
}

function invalidateCampaignQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: campaignKeys.all });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignCreateInput) =>
      apiClient<{
        campaign: Campaign;
        activated: boolean;
        schedule?: Record<string, unknown>;
      }>("/api/campaigns", { method: "POST", body: input }),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useUpdateCampaign(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignUpdateInput) =>
      apiClient<{ campaign: Campaign }>(`/api/campaigns/${id}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ deleted: boolean }>(`/api/campaigns/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useActivateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ campaign: Campaign; schedule: Record<string, unknown> }>(
        `/api/campaigns/${id}/activate`,
        { method: "POST" }
      ),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ campaign: Campaign }>(`/api/campaigns/${id}/pause`, {
        method: "POST",
      }),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useResumeCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ campaign: Campaign }>(`/api/campaigns/${id}/resume`, {
        method: "POST",
      }),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ campaign: Campaign }>(`/api/campaigns/${id}/cancel`, {
        method: "POST",
      }),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useExtendCampaign(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignExtendInput) =>
      apiClient<{ campaign: Campaign; schedule: Record<string, unknown> }>(
        `/api/campaigns/${id}/extend`,
        { method: "POST", body: input }
      ),
    onSuccess: () => invalidateCampaignQueries(queryClient),
  });
}

export function useCampaignUsage(id: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: [...campaignKeys.detail(id ?? "", organizationId), "usage"],
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () =>
      apiClient<{
        usage: {
          enrolledCustomers: number;
          cardsScheduled: number;
          artworksGenerated: number;
          testMailings: number;
          liveMailings: number;
          failedMailings: number;
          skippedMailings: number;
          plannedMailings: number;
          submittedMailings: number;
        };
        billing: Record<string, unknown> | null;
        freeTesting: boolean;
        banner: string;
        physicalMailDisclaimer: string;
      }>(`/api/campaigns/${id}/usage`),
  });
}

export function useCampaignQuote() {
  return useMutation({
    mutationFn: (input: {
      estimatedCardCount: number;
      enrolledCustomerCount: number;
      mailingMode?: "dry_run" | "test" | "live";
      campaignId?: string;
    }) =>
      apiClient<{
        quote: {
          displayLabel: string;
          estimatedTotalCents: number;
          freeTestingBanner: string | null;
          physicalMailDisclaimer: string;
          chargesEnabled: boolean;
        };
      }>("/api/campaigns/quote", { method: "POST", body: input }),
  });
}

export type CampaignArtworkPreviewResult = {
  artwork: {
    frontPngBase64: string;
    backPngBase64: string;
    pdfBase64: string | null;
  };
  copy?: {
    greeting?: string;
    message?: string;
    footer?: string;
  };
};

export function useCampaignArtworkPreview() {
  return useMutation({
    mutationFn: async (input: {
      mailingId: string;
      templateId: string;
      customerId: string;
      occasionSlug?: string;
      occasionName?: string;
      messageTemplateOverride?: string | null;
      campaignName?: string;
      customerLabel?: string;
      includeCompanyLogo?: boolean;
    }) => {
      const result = await apiClient<CampaignArtworkPreviewResult>(
        "/api/campaigns/preview",
        {
          method: "POST",
          body: {
            templateId: input.templateId,
            customerId: input.customerId,
            occasionSlug: input.occasionSlug,
            occasionName: input.occasionName,
            messageTemplateOverride:
              input.messageTemplateOverride ?? undefined,
            campaignName: input.campaignName,
            includePdf: false,
            includeCompanyLogo: input.includeCompanyLogo === true,
          },
        }
      );
      return { ...result, mailingId: input.mailingId, customerLabel: input.customerLabel };
    },
  });
}
