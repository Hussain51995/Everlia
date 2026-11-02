import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/lib/types/auth";

export type OrganizationInvitationRecord = {
  id: string;
  organization_id: string;
  email: string | null;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  revoked_at: string | null;
  created_by: string | null;
};

export type CreatedInvitation = {
  invitationId: string;
  organizationId: string;
  token: string;
  expiresAt: string;
  email: string | null;
};

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createOrganizationInvitation(params: {
  organizationId: string;
  createdBy: string;
  email?: string;
  expiresInHours?: number;
}): Promise<CreatedInvitation> {
  const admin = createAdminClient();
  const hours = params.expiresInHours ?? 168;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const email = params.email?.trim().toLowerCase() || null;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, is_active, onboarding_status")
    .eq("id", params.organizationId)
    .maybeSingle();

  if (orgError) throw new Error(orgError.message);
  if (!org || !org.is_active || org.onboarding_status !== "active") {
    throw new Error("Selected organization is invalid or inactive");
  }

  const { data, error } = await admin
    .from("organization_invitations")
    .insert({
      organization_id: params.organizationId,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: params.createdBy,
    })
    .select("id, organization_id, expires_at, email")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create invitation");
  }

  return {
    invitationId: data.id as string,
    organizationId: data.organization_id as string,
    token,
    expiresAt: data.expires_at as string,
    email: (data.email as string | null) ?? null,
  };
}

export async function findValidInvitationByToken(token: string): Promise<{
  invitation: OrganizationInvitationRecord;
  organization: Organization & {
    join_policy?: string;
    workspace_type?: string;
    onboarding_status?: string;
  };
}> {
  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token.trim());

  const { data, error } = await admin
    .from("organization_invitations")
    .select(
      `
      id,
      organization_id,
      email,
      expires_at,
      redeemed_at,
      redeemed_by,
      revoked_at,
      created_by,
      organization:organizations (
        id,
        name,
        slug,
        industry_id,
        is_active,
        join_policy,
        workspace_type,
        onboarding_status
      )
    `
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Invitation is invalid or expired");
  }

  if (data.revoked_at) {
    throw new Error("Invitation has been revoked");
  }
  if (data.redeemed_at) {
    throw new Error("Invitation has already been used");
  }
  if (new Date(data.expires_at as string).getTime() <= Date.now()) {
    throw new Error("Invitation has expired");
  }

  const orgRaw = data.organization;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  if (!org || !org.is_active || org.onboarding_status !== "active") {
    throw new Error("Invitation organization is invalid or inactive");
  }

  return {
    invitation: {
      id: data.id as string,
      organization_id: data.organization_id as string,
      email: (data.email as string | null) ?? null,
      expires_at: data.expires_at as string,
      redeemed_at: (data.redeemed_at as string | null) ?? null,
      redeemed_by: (data.redeemed_by as string | null) ?? null,
      revoked_at: (data.revoked_at as string | null) ?? null,
      created_by: (data.created_by as string | null) ?? null,
    },
    organization: org as Organization & {
      join_policy?: string;
      workspace_type?: string;
      onboarding_status?: string;
    },
  };
}

export async function assertInvitationForUser(params: {
  token: string;
  userId: string;
  userEmail: string | null;
  organizationId?: string;
}): Promise<{
  invitation: OrganizationInvitationRecord;
  organization: Organization;
}> {
  const { invitation, organization } = await findValidInvitationByToken(
    params.token
  );

  if (
    params.organizationId &&
    invitation.organization_id !== params.organizationId
  ) {
    throw new Error("Invitation does not match the selected organization");
  }

  if (invitation.email) {
    const userEmail = params.userEmail?.trim().toLowerCase() ?? "";
    if (!userEmail || userEmail !== invitation.email.toLowerCase()) {
      throw new Error("Invitation is locked to a different email address");
    }
  }

  return { invitation, organization };
}

export async function markInvitationRedeemed(params: {
  invitationId: string;
  userId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_invitations")
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by: params.userId,
    })
    .eq("id", params.invitationId)
    .is("redeemed_at", null);

  if (error) {
    throw new Error(error.message);
  }
}
