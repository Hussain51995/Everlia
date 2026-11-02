import type { OrganizationJoinPolicy } from "@/lib/types/auth";
import type { MembershipActivation } from "@/lib/types/onboarding";

export type JoinMembershipIntent =
  | {
      kind: "blocked";
      activation: Extract<
        MembershipActivation,
        "invitation_required" | "domain_mismatch"
      >;
      message: string;
    }
  | {
      kind: "upsert";
      targetStatus: "pending" | "active";
      activationIfUnverified: "email_unverified";
      requiresVerifiedEmailForActive: boolean;
      pendingMessage: string;
      activeMessage: (organizationName: string) => string;
    };

export function resolveJoinMembershipIntent(params: {
  policy: OrganizationJoinPolicy;
  hasInvitation: boolean;
  hasEmailDomain: boolean;
  domainVerifiedForOrg: boolean;
  organizationName: string;
}): JoinMembershipIntent {
  const { policy, hasInvitation } = params;

  if (policy === "invite_only" && !hasInvitation) {
    return {
      kind: "blocked",
      activation: "invitation_required",
      message: "This organization requires a valid invitation to join",
    };
  }

  if (policy === "verified_domain" && !hasInvitation) {
    if (!params.hasEmailDomain) {
      return {
        kind: "blocked",
        activation: "domain_mismatch",
        message: "A verified work email is required to join this organization",
      };
    }
    if (!params.domainVerifiedForOrg) {
      return {
        kind: "blocked",
        activation: "domain_mismatch",
        message:
          "Your email domain is not a verified domain for this organization",
      };
    }
  }

  const wantsActive = policy !== "approval_required" || hasInvitation;

  return {
    kind: "upsert",
    targetStatus: wantsActive ? "active" : "pending",
    activationIfUnverified: "email_unverified",
    requiresVerifiedEmailForActive: wantsActive,
    pendingMessage: `Join request submitted for ${params.organizationName}. An organization admin must approve access.`,
    activeMessage: (name) => `You joined ${name}`,
  };
}
