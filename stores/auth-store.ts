"use client";

import { create } from "zustand";
import type {
  AuthUser,
  OrganizationMembership,
  Profile,
  SessionPayload,
} from "@/lib/types/auth";

type SignupStep = 1 | 2 | 3;

type AuthState = {
  user: AuthUser | null;
  profile: Profile | null;
  membership: OrganizationMembership | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  isPlatformAdmin: boolean;
  canUseMemberOrganizations: boolean;
  sessionReady: boolean;
  signupStep: SignupStep;
  industryId: string | null;
  organizationId: string | null;
  setSession: (session: SessionPayload | null) => void;
  clearSession: () => void;
  setSessionReady: (ready: boolean) => void;
  setActiveOrganization: (organizationId: string | null) => void;
  setSignupStep: (step: SignupStep) => void;
  setIndustryId: (industryId: string | null) => void;
  setOrganizationId: (organizationId: string | null) => void;
  resetSignupWizard: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  membership: null,
  memberships: [],
  activeOrganizationId: null,
  isPlatformAdmin: false,
  canUseMemberOrganizations: false,
  sessionReady: false,
  signupStep: 1,
  industryId: null,
  organizationId: null,

  setSession: (session) =>
    set({
      user: session?.user ?? null,
      profile: session?.profile ?? null,
      membership: session?.membership ?? null,
      memberships: session?.memberships ?? [],
      activeOrganizationId: session?.activeOrganizationId ?? null,
      isPlatformAdmin: session?.isPlatformAdmin ?? false,
      canUseMemberOrganizations: session?.canUseMemberOrganizations ?? false,
      sessionReady: true,
    }),

  clearSession: () =>
    set({
      user: null,
      profile: null,
      membership: null,
      memberships: [],
      activeOrganizationId: null,
      isPlatformAdmin: false,
      canUseMemberOrganizations: false,
      sessionReady: true,
    }),

  setSessionReady: (sessionReady) => set({ sessionReady }),

  setActiveOrganization: (organizationId) =>
    set((state) => {
      const membership =
        state.memberships.find((m) => m.organization_id === organizationId) ??
        null;
      return {
        activeOrganizationId: organizationId,
        membership,
      };
    }),

  setSignupStep: (signupStep) => set({ signupStep }),

  setIndustryId: (industryId) =>
    set({
      industryId,
      organizationId: null,
    }),

  setOrganizationId: (organizationId) => set({ organizationId }),

  resetSignupWizard: () =>
    set({
      signupStep: 1,
      industryId: null,
      organizationId: null,
    }),
}));
