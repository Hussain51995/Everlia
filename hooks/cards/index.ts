"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  cardKeys,
  templateKeys,
  customerKeys,
  responseKeys,
} from "@/hooks/cards/keys";
import { useAuthStore } from "@/stores/auth-store";
import type {
  CardResponse,
  CardTemplate,
  Customer,
  GreetingCard,
  MailTransaction,
} from "@/lib/types/cards";
import type {
  CustomerCreateInput,
  CustomerUpdateInput,
  GreetingCardCreateInput,
  GreetingCardUpdateInput,
} from "@/lib/validations/cards";

function useActiveOrgId() {
  return useAuthStore((state) => state.activeOrganizationId);
}

export function useTemplates() {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: templateKeys.list(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ templates: CardTemplate[] }>(
        "/api/templates"
      );
      return data.templates;
    },
  });
}

export function useTemplate(id: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: templateKeys.detail(id ?? "", organizationId),
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ template: CardTemplate }>(
        `/api/templates/${id}`
      );
      return data.template;
    },
  });
}

export function useCustomers() {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: customerKeys.list(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ customers: Customer[] }>("/api/customers");
      return data.customers;
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerCreateInput) =>
      apiClient<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CustomerUpdateInput & { id: string }) =>
      apiClient<{ customer: Customer }>(`/api/customers/${id}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ deleted: boolean }>(`/api/customers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useCards() {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: cardKeys.list(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ cards: GreetingCard[] }>("/api/cards");
      return data.cards;
    },
  });
}

export function useCard(id: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: cardKeys.detail(id ?? "", organizationId),
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{
        card: GreetingCard;
        qrToken: string | null;
        respondUrl: string | null;
      }>(`/api/cards/${id}`);
      return data;
    },
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GreetingCardCreateInput) =>
      apiClient<{ card: GreetingCard }>("/api/cards", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  const organizationId = useActiveOrgId();
  return useMutation({
    mutationFn: ({ id, ...input }: GreetingCardUpdateInput & { id: string }) =>
      apiClient<{ card: GreetingCard }>(`/api/cards/${id}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
      queryClient.invalidateQueries({
        queryKey: cardKeys.detail(variables.id, organizationId),
      });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ deleted: boolean; id: string }>(`/api/cards/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useGenerateArtwork() {
  const queryClient = useQueryClient();
  const organizationId = useActiveOrgId();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{
        card: GreetingCard;
        artwork: { frontUrl: string; backUrl: string; pdfUrl?: string };
        qrToken: string;
        respondUrl: string;
      }>(`/api/cards/${id}/artwork`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: cardKeys.detail(id, organizationId),
      });
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useSendCard() {
  const queryClient = useQueryClient();
  const organizationId = useActiveOrgId();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{
        card: GreetingCard;
        mail: {
          provider: string;
          providerMailId: string;
          providerStatus: string;
        };
      }>(`/api/cards/${id}/send`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({
        queryKey: cardKeys.detail(id, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: cardKeys.status(id, organizationId),
      });
      queryClient.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useCardStatus(id: string | null) {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: cardKeys.status(id ?? "", organizationId),
    enabled: Boolean(id) && Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{
        card: GreetingCard;
        latestTransaction: MailTransaction | null;
        transactions: MailTransaction[];
      }>(`/api/cards/${id}/status`);
      return data;
    },
  });
}

export function useResponses() {
  const organizationId = useActiveOrgId();
  return useQuery({
    queryKey: responseKeys.list(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ responses: CardResponse[] }>(
        "/api/responses"
      );
      return data.responses;
    },
  });
}
