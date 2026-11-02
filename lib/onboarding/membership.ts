import { createAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import {
  assertInvitationForUser,
  markInvitationRedeemed,
} from "@/lib/onboarding/invitations";
import type {
  Organization,
  OrganizationJoinPolicy,
  OrganizationMembership,
  OrganizationOnboardingStatus,
  OrganizationWorkspaceType,
  MembershipStatus,
} from "@/lib/types/auth";
import type {
  MembershipActivation,
  RequestMembershipResult,
} from "@/lib/types/onboarding";
import { resolveJoinMembershipIntent } from "@/lib/onboarding/join-policy";

export type OrganizationForJoin = Organization & {
  join_policy: OrganizationJoinPolicy;
  workspace_type?: OrganizationWorkspaceType;
  onboarding_status?: OrganizationOnboardingStatus;
};

export async function loadOrganizationForJoin(
  organizationId: string
): Promise<OrganizationForJoin> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      `
      id,
      name,
      slug,
      industry_id,
      is_active,
      join_policy,
      workspace_type,
      onboarding_status,
      industries ( id, is_active )
    `
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const industry = Array.isArray(data?.industries)
    ? data?.industries[0]
    : data?.industries;

  if (
    !data ||
    !data.is_active ||
    data.onboarding_status !== "active" ||
    !industry ||
    industry.is_active !== true
  ) {
    throw new Error("Selected organization is invalid or inactive");
  }

  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    industry_id: data.industry_id as string,
    is_active: data.is_active as boolean,
    join_policy: data.join_policy as OrganizationJoinPolicy,
    workspace_type: data.workspace_type as OrganizationWorkspaceType | undefined,
    onboarding_status:
      data.onboarding_status as OrganizationOnboardingStatus | undefined,
  };
}

async function userHasVerifiedEmail(userId: string): Promise<{
  verified: boolean;
  email: string | null;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Error(error?.message ?? "User not found");
  }
  const email = data.user.email?.toLowerCase() ?? null;
  const verified = Boolean(data.user.email_confirmed_at);
  return { verified, email };
}

async function domainIsVerifiedForOrganization(params: {
  organizationId: string;
  domain: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_domains")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("domain", params.domain)
    .eq("verification_status", "verified")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

async function upsertMembership(params: {
  userId: string;
  organizationId: string;
  status: Extract<MembershipStatus, "pending" | "active">;
}): Promise<{
  membership: OrganizationMembership;
  alreadyMember: boolean;
  created: boolean;
}> {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .eq("organization_id", params.organizationId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const current = existing as OrganizationMembership;
    if (current.status === "active") {
      return { membership: current, alreadyMember: true, created: false };
    }

    if (
      current.status === "pending" &&
      params.status === "active"
    ) {
      const { data, error } = await admin
        .from("organization_members")
        .update({ status: "active" })
        .eq("id", current.id)
        .select("id, organization_id, user_id, role, status")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed to activate membership");
      return {
        membership: data as OrganizationMembership,
        alreadyMember: false,
        created: false,
      };
    }

    return { membership: current, alreadyMember: true, created: false };
  }

  const { data, error } = await admin
    .from("organization_members")
    .insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      role: "member",
      status: params.status,
    })
    .select("id, organization_id, user_id, role, status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create membership");
  }

  return {
    membership: data as OrganizationMembership,
    alreadyMember: false,
    created: true,
  };
}

function resultFromMembership(params: {
  activation: MembershipActivation;
  organization: OrganizationForJoin;
  membership: OrganizationMembership | null;
  message: string;
}): RequestMembershipResult {
  return {
    activation: params.activation,
    organizationId: params.organization.id,
    organizationName: params.organization.name,
    membershipId: params.membership?.id ?? null,
    membershipStatus:
      (params.membership?.status as RequestMembershipResult["membershipStatus"]) ??
      null,
    message: params.message,
  };
}

export async function requestOrganizationMembership(params: {
  userId: string;
  organizationId: string;
  invitationToken?: string;
}): Promise<RequestMembershipResult> {
  const organization = await loadOrganizationForJoin(params.organizationId);
  const { verified, email } = await userHasVerifiedEmail(params.userId);
  const policy = organization.join_policy;

  let invitationUsed:
    | Awaited<ReturnType<typeof assertInvitationForUser>>
    | null = null;

  if (params.invitationToken) {
    invitationUsed = await assertInvitationForUser({
      token: params.invitationToken,
      userId: params.userId,
      userEmail: email,
      organizationId: params.organizationId,
    });
  }

  const emailDomain = extractEmailDomain(email ?? "");
  let domainVerifiedForOrg = false;
  if (policy === "verified_domain" && !invitationUsed && emailDomain) {
    domainVerifiedForOrg = await domainIsVerifiedForOrganization({
      organizationId: organization.id,
      domain: emailDomain,
    });
  }

  const intent = resolveJoinMembershipIntent({
    policy,
    hasInvitation: Boolean(invitationUsed),
    hasEmailDomain: Boolean(emailDomain),
    domainVerifiedForOrg,
    organizationName: organization.name,
  });

  if (intent.kind === "blocked") {
    return resultFromMembership({
      activation: intent.activation,
      organization,
      membership: null,
      message: intent.message,
    });
  }

  if (intent.requiresVerifiedEmailForActive && !verified) {
    const pending = await upsertMembership({
      userId: params.userId,
      organizationId: organization.id,
      status: "pending",
    });
    if (invitationUsed) {
      await markInvitationRedeemed({
        invitationId: invitationUsed.invitation.id,
        userId: params.userId,
      });
    }
    return resultFromMembership({
      activation: intent.activationIfUnverified,
      organization,
      membership: pending.membership,
      message:
        "Membership is pending until you verify your email address",
    });
  }

  const targetStatus = intent.targetStatus;
  const upserted = await upsertMembership({
    userId: params.userId,
    organizationId: organization.id,
    status: targetStatus,
  });

  if (invitationUsed && upserted.created) {
    await markInvitationRedeemed({
      invitationId: invitationUsed.invitation.id,
      userId: params.userId,
    });
  }

  if (upserted.alreadyMember && upserted.membership.status === "active") {
    return resultFromMembership({
      activation: "already_member",
      organization,
      membership: upserted.membership,
      message: `You are already a member of ${organization.name}`,
    });
  }

  if (targetStatus === "pending") {
    return resultFromMembership({
      activation: "pending",
      organization,
      membership: upserted.membership,
      message: intent.pendingMessage,
    });
  }

  return resultFromMembership({
    activation: "active",
    organization,
    membership: upserted.membership,
    message: intent.activeMessage(organization.name),
  });
}
