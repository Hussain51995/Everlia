"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { DiscoveryResult } from "@/lib/types/onboarding";
import type { SessionPayload } from "@/lib/types/auth";

export function useDiscoverOrganizations() {
  return useMutation({
    mutationFn: (input: { industryId: string; email: string }) =>
      apiClient<DiscoveryResult>("/api/onboarding/discover", {
        method: "POST",
        body: input,
      }),
  });
}

export function useRegisterIndependent() {
  return useMutation({
    mutationFn: (input: {
      industryId: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      displayName?: string;
    }) =>
      apiClient<{
        user: { id: string; email: string | null } | null;
        organizationId: string;
        organizationName: string;
        requiresEmailConfirmation: boolean;
        emailVerificationEnabled: boolean;
        verificationLink: string | null;
        session: null;
      }>("/api/onboarding/register-independent", {
        method: "POST",
        body: input,
      }),
  });
}

export function useRegisterOrganizationRequest() {
  return useMutation({
    mutationFn: (input: {
      industryId: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      organizationName: string;
      domain?: string;
      workspaceType?: "company" | "team";
    }) =>
      apiClient<{
        user: { id: string; email: string | null } | null;
        organizationId: string;
        organizationName: string;
        requestId: string;
        requiresEmailConfirmation: boolean;
        emailVerificationEnabled: boolean;
        verificationLink: string | null;
        session: null;
      }>("/api/onboarding/register-organization-request", {
        method: "POST",
        body: input,
      }),
  });
}

export function useRequestMembership() {
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      invitationToken?: string;
    }) =>
      apiClient<{
        activation: string;
        organizationId: string;
        organizationName: string;
        membershipStatus: string | null;
        message: string;
        session: SessionPayload | null;
      }>("/api/onboarding/request-membership", {
        method: "POST",
        body: input,
      }),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (input: { invitationToken: string }) =>
      apiClient<{
        activation: string;
        organizationId: string;
        organizationName: string;
        message: string;
        session: SessionPayload | null;
      }>("/api/onboarding/accept-invitation", {
        method: "POST",
        body: input,
      }),
  });
}

export function useResolveInvitation() {
  return useMutation({
    mutationFn: (input: { invitationToken: string }) =>
      apiClient<{
        organizationId: string;
        organizationName: string;
        organizationSlug: string;
        emailLockedTo: string | null;
        expiresAt: string;
      }>("/api/onboarding/resolve-invitation", {
        method: "POST",
        body: input,
      }),
  });
}

export function useProvisionIndependent() {
  return useMutation({
    mutationFn: (input: { industryId: string; displayName?: string }) =>
      apiClient<{
        organizationId: string;
        organizationName: string;
        workspaceType: "independent";
        role: "owner";
        session: SessionPayload | null;
      }>("/api/onboarding/provision-independent", {
        method: "POST",
        body: input,
      }),
  });
}

export function useSubmitOrganizationRequest() {
  return useMutation({
    mutationFn: (input: {
      industryId: string;
      name: string;
      domain?: string;
      workspaceType?: "company" | "team";
    }) =>
      apiClient<{
        requestId: string;
        status: "pending";
        requestedName: string;
        industryId: string;
      }>("/api/onboarding/request-organization", {
        method: "POST",
        body: input,
      }),
  });
}
