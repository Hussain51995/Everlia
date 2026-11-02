import type {
  DiscoverableOrganizationSummary,
  DiscoveryResult,
} from "@/lib/types/onboarding";
import type { OrganizationJoinPolicy } from "@/lib/types/auth";

export function buildDiscoveryResult(params: {
  email: string | null;
  domain: string | null;
  isPersonal: boolean;
  matches: DiscoverableOrganizationSummary[];
}): DiscoveryResult {
  if (!params.email || !params.domain) {
    return {
      state: "invalid_email",
      email: null,
      domain: null,
      organizations: [],
      message: "Enter a valid work email address",
    };
  }

  if (params.isPersonal) {
    return {
      state: "personal_email",
      email: params.email,
      domain: params.domain,
      organizations: [],
      paths: {
        canContinueIndependent: true,
        canUseInvitation: true,
      },
      message:
        "Personal email providers cannot be used for automatic organization matching. Continue as an independent professional or use an organization invitation.",
    };
  }

  if (params.matches.length === 0) {
    return {
      state: "no_match",
      email: params.email,
      domain: params.domain,
      organizations: [],
      paths: {
        canRequestOrganization: true,
        canContinueIndependent: true,
      },
      message:
        "No verified organization matched this email domain. You can request a new organization or continue as an independent professional.",
    };
  }

  if (params.matches.length === 1) {
    const org = params.matches[0]!;
    return {
      state: "single_match",
      email: params.email,
      domain: params.domain,
      organizations: [org],
      preselectedOrganizationId: org.id,
      joinPolicy: org.joinPolicy,
      requiresVerifiedIdentity: true,
      message: `Matched organization “${org.name}”. Sign in or create an account to continue — membership activates only after verified identity.`,
    };
  }

  return {
    state: "multiple_matches",
    email: params.email,
    domain: params.domain,
    organizations: params.matches,
    requiresSelection: true,
    requiresInvitationForDisambiguation: true,
    requiresVerifiedIdentity: true,
    message:
      "Multiple organizations share this verified domain. Select the correct organization or use an invitation — we will not choose automatically.",
  };
}

export function sortDiscoverableOrganizations(
  matches: DiscoverableOrganizationSummary[]
): DiscoverableOrganizationSummary[] {
  return [...matches].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  );
}

export function summaryJoinPolicy(
  org: DiscoverableOrganizationSummary
): OrganizationJoinPolicy {
  return org.joinPolicy;
}
