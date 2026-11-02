import type {
  OrganizationJoinPolicy,
  OrganizationWorkspaceType,
} from "@/lib/types/auth";

export type DiscoveryState =
  | "single_match"
  | "multiple_matches"
  | "no_match"
  | "personal_email"
  | "invalid_email";

export type DiscoverableOrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  industryId: string;
  workspaceType: OrganizationWorkspaceType;
  joinPolicy: OrganizationJoinPolicy;
  matchedDomain: string;
};

export type DiscoveryNoMatchPaths = {
  canRequestOrganization: true;
  canContinueIndependent: true;
};

export type DiscoveryPersonalEmailPaths = {
  canContinueIndependent: true;
  canUseInvitation: true;
};

export type DiscoveryResult =
  | {
      state: "invalid_email";
      email: null;
      domain: null;
      organizations: [];
      message: string;
    }
  | {
      state: "personal_email";
      email: string;
      domain: string;
      organizations: [];
      paths: DiscoveryPersonalEmailPaths;
      message: string;
    }
  | {
      state: "no_match";
      email: string;
      domain: string;
      organizations: [];
      paths: DiscoveryNoMatchPaths;
      message: string;
    }
  | {
      state: "single_match";
      email: string;
      domain: string;
      organizations: [DiscoverableOrganizationSummary];
      preselectedOrganizationId: string;
      joinPolicy: OrganizationJoinPolicy;
      requiresVerifiedIdentity: true;
      message: string;
    }
  | {
      state: "multiple_matches";
      email: string;
      domain: string;
      organizations: DiscoverableOrganizationSummary[];
      requiresSelection: true;
      requiresInvitationForDisambiguation: true;
      requiresVerifiedIdentity: true;
      message: string;
    };

export type MembershipActivation =
  | "active"
  | "pending"
  | "already_member"
  | "invitation_required"
  | "domain_mismatch"
  | "email_unverified";

export type RequestMembershipResult = {
  activation: MembershipActivation;
  organizationId: string;
  organizationName: string;
  membershipId: string | null;
  membershipStatus: "pending" | "active" | "rejected" | null;
  message: string;
};

export type OrganizationRequestSubmitResult = {
  requestId: string;
  status: "pending";
  requestedName: string;
  industryId: string;
};

export type IndependentWorkspaceResult = {
  organizationId: string;
  organizationName: string;
  workspaceType: "independent";
  role: "owner";
};
