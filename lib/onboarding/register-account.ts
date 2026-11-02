import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailVerificationEnabled } from "@/lib/auth/config";
import {
  generateEmailVerificationLink,
  resendVerificationEmail,
} from "@/lib/auth/email-verification";
import {
  slugifyOrganizationName,
  withSlugSuffix,
} from "@/lib/auth/slugify";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";

export type RegisterAccountResult = {
  user: { id: string; email: string | null } | null;
  organizationId: string;
  organizationName: string;
  requiresEmailConfirmation: true;
  emailVerificationEnabled: boolean;
  verificationLink: string | null;
  path: "independent" | "organization_request" | "join";
};

async function assertActiveIndustry(industryId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industries")
    .select("id")
    .eq("id", industryId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Selected industry is invalid or inactive");
}

async function insertOrganization(params: {
  industryId: string;
  name: string;
  workspaceType: "company" | "team" | "independent";
  joinPolicy: "invite_only" | "approval_required" | "verified_domain";
  onboardingStatus: "pending" | "active";
  isActive: boolean;
  createdBy?: string | null;
}) {
  const admin = createAdminClient();
  const baseSlug = slugifyOrganizationName(params.name);
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);
    const { data, error } = await admin
      .from("organizations")
      .insert({
        industry_id: params.industryId,
        name: params.name.trim(),
        slug,
        is_active: params.isActive,
        workspace_type: params.workspaceType,
        onboarding_status: params.onboardingStatus,
        join_policy: params.joinPolicy,
        created_by: params.createdBy ?? null,
      })
      .select("id, name")
      .single();

    if (!error && data) {
      return { id: data.id as string, name: data.name as string };
    }

    lastError = error?.message ?? "Failed to create organization";
    if (error?.code === "23505") continue;
    throw new Error(lastError);
  }

  throw new Error(lastError ?? "Failed to create organization");
}

async function createAuthUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: false,
    user_metadata: {
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone || null,
      organization_id: params.organizationId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

async function elevateToOwner(params: {
  userId: string;
  organizationId: string;
  status?: "pending" | "active";
}) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("assign_organization_owner", {
    p_organization_id: params.organizationId,
    p_user_id: params.userId,
    p_status: params.status ?? "pending",
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function sendVerification(email: string, firstName: string) {
  const emailVerificationEnabled = isEmailVerificationEnabled();
  let verificationLink: string | null = null;
  if (emailVerificationEnabled) {
    await resendVerificationEmail(email, firstName);
  } else {
    verificationLink = await generateEmailVerificationLink(email);
  }
  return { emailVerificationEnabled, verificationLink };
}

export async function registerIndependentAccount(params: {
  industryId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  displayName?: string;
}): Promise<RegisterAccountResult> {
  await assertActiveIndustry(params.industryId);

  const displayName =
    params.displayName?.trim() ||
    `${params.firstName} ${params.lastName}`.trim() ||
    "Independent Workspace";

  const org = await insertOrganization({
    industryId: params.industryId,
    name: displayName,
    workspaceType: "independent",
    joinPolicy: "invite_only",
    onboardingStatus: "active",
    isActive: true,
  });

  let user;
  try {
    user = await createAuthUser({
      email: params.email,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      organizationId: org.id,
    });
  } catch (error) {
    const admin = createAdminClient();
    await admin.from("organizations").delete().eq("id", org.id);
    throw error;
  }

  if (user?.id) {
    await elevateToOwner({ userId: user.id, organizationId: org.id });
    await createAdminClient()
      .from("organizations")
      .update({ created_by: user.id })
      .eq("id", org.id);
  }

  const verification = await sendVerification(
    params.email,
    params.firstName
  );

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    organizationId: org.id,
    organizationName: org.name,
    requiresEmailConfirmation: true,
    emailVerificationEnabled: verification.emailVerificationEnabled,
    verificationLink: verification.verificationLink,
    path: "independent",
  };
}

export async function registerOrganizationRequestAccount(params: {
  industryId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
  domain?: string;
  workspaceType: "company" | "team";
}): Promise<RegisterAccountResult & { requestId: string }> {
  await assertActiveIndustry(params.industryId);

  const requestedDomain = params.domain?.trim()
    ? extractEmailDomain(params.domain)
    : extractEmailDomain(params.email);

  const org = await insertOrganization({
    industryId: params.industryId,
    name: params.organizationName,
    workspaceType: params.workspaceType,
    joinPolicy: requestedDomain ? "verified_domain" : "approval_required",
    onboardingStatus: "pending",
    isActive: false,
  });

  let user;
  try {
    user = await createAuthUser({
      email: params.email,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      organizationId: org.id,
    });
  } catch (error) {
    const admin = createAdminClient();
    await admin.from("organizations").delete().eq("id", org.id);
    throw error;
  }

  if (user?.id) {
    await elevateToOwner({ userId: user.id, organizationId: org.id });
    await createAdminClient()
      .from("organizations")
      .update({ created_by: user.id })
      .eq("id", org.id);
  }

  const admin = createAdminClient();
  const { data: requestRow, error: requestError } = await admin
    .from("organization_requests")
    .insert({
      industry_id: params.industryId,
      requesting_user_id: user!.id,
      requested_name: params.organizationName.trim(),
      requested_domain: requestedDomain,
      requested_workspace_type: params.workspaceType,
      status: "pending",
      resulting_organization_id: org.id,
    })
    .select("id")
    .single();

  if (requestError || !requestRow) {
    throw new Error(requestError?.message ?? "Failed to create organization request");
  }

  if (requestedDomain) {
    await admin.from("organization_domains").insert({
      organization_id: org.id,
      domain: requestedDomain,
      verification_status: "pending",
    });
  }

  const verification = await sendVerification(
    params.email,
    params.firstName
  );

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    organizationId: org.id,
    organizationName: org.name,
    requestId: requestRow.id as string,
    requiresEmailConfirmation: true,
    emailVerificationEnabled: verification.emailVerificationEnabled,
    verificationLink: verification.verificationLink,
    path: "organization_request",
  };
}
