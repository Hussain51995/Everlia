"use client";

import { create } from "zustand";
import type {
  AuthUser,
  OrganizationMembership,
  Profile,
  SessionPayload,
} from "@/lib/types/auth";
import type {
  DiscoverableOrganizationSummary,
  DiscoveryResult,
} from "@/lib/types/onboarding";

export type SignupWizardStep = 1 | 2 | 3 | 4;
export type SignupIntent =
  | "join"
  | "independent"
  | "request_organization"
  | "invitation";
export type SignupAccountMode = "new" | "existing";

type AuthState = {
  user: AuthUser | null;
  profile: Profile | null;
  membership: OrganizationMembership | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  isPlatformAdmin: boolean;
  canUseMemberOrganizations: boolean;
  sessionReady: boolean;

  signupStep: SignupWizardStep;
  industryId: string | null;
  organizationId: string | null;
  signupEmail: string;
  discoveryResult: DiscoveryResult | null;
  signupIntent: SignupIntent | null;
  invitationToken: string;
  accountMode: SignupAccountMode;
  selectedDiscoverableOrg: DiscoverableOrganizationSummary | null;

  setSession: (session: SessionPayload | null) => void;
  clearSession: () => void;
  setSessionReady: (ready: boolean) => void;
  setActiveOrganization: (organizationId: string | null) => void;
  setSignupStep: (step: SignupWizardStep) => void;
  setIndustryId: (industryId: string | null) => void;
  setOrganizationId: (organizationId: string | null) => void;
  setSignupEmail: (email: string) => void;
  setDiscoveryResult: (result: DiscoveryResult | null) => void;
  setSignupIntent: (intent: SignupIntent | null) => void;
  setInvitationToken: (token: string) => void;
  setAccountMode: (mode: SignupAccountMode) => void;
  setSelectedDiscoverableOrg: (
    org: DiscoverableOrganizationSummary | null
  ) => void;
  resetSignupWizard: () => void;
};

const initialSignupState = {
  signupStep: 1 as SignupWizardStep,
  industryId: null as string | null,
  organizationId: null as string | null,
  signupEmail: "",
  discoveryResult: null as DiscoveryResult | null,
  signupIntent: null as SignupIntent | null,
  invitationToken: "",
  accountMode: "new" as SignupAccountMode,
  selectedDiscoverableOrg: null as DiscoverableOrganizationSummary | null,
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
  ...initialSignupState,

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
      discoveryResult: null,
      signupIntent: null,
      selectedDiscoverableOrg: null,
      invitationToken: "",
    }),

  setOrganizationId: (organizationId) => set({ organizationId }),

  setSignupEmail: (signupEmail) => set({ signupEmail }),

  setDiscoveryResult: (discoveryResult) => set({ discoveryResult }),

  setSignupIntent: (signupIntent) => set({ signupIntent }),

  setInvitationToken: (invitationToken) => set({ invitationToken }),

  setAccountMode: (accountMode) => set({ accountMode }),

  setSelectedDiscoverableOrg: (selectedDiscoverableOrg) =>
    set({
      selectedDiscoverableOrg,
      organizationId: selectedDiscoverableOrg?.id ?? null,
    }),

  resetSignupWizard: () => set({ ...initialSignupState }),
}));
