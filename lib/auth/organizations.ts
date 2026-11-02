import { createAdminClient } from "@/lib/supabase/admin";
import {
  slugifyOrganizationName,
  withSlugSuffix,
} from "@/lib/auth/slugify";
import { ensureDomainVerificationChallenge } from "@/lib/onboarding/domain-challenge";
import { verifyOrganizationDomain } from "@/lib/onboarding/domain-verification";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import type {
  Industry,
  Organization,
  OrganizationDomain,
  OrganizationJoinPolicy,
  OrganizationWorkspaceType,
} from "@/lib/types/auth";

type CreateOrganizationInput = {
  industryId: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  domain?: string;
  workspaceType?: Extract<OrganizationWorkspaceType, "company" | "team">;
  joinPolicy?: OrganizationJoinPolicy;
  markDomainVerified?: boolean;
};

type CreateIndustryInput = {
  name: string;
  slug?: string;
  isActive?: boolean;
};

export async function assertActiveIndustry(industryId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industries")
    .select("id")
    .eq("id", industryId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selected industry is invalid or inactive");
  }
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{
  organization: Organization;
  domain: OrganizationDomain | null;
}> {
  await assertActiveIndustry(input.industryId);

  const domain = input.domain?.trim()
    ? extractEmailDomain(input.domain)
    : null;
  if (input.domain?.trim() && !domain) {
    throw new Error("Company domain is invalid");
  }

  const workspaceType = input.workspaceType ?? "company";
  const joinPolicy =
    input.joinPolicy ??
    (domain ? "verified_domain" : "approval_required");
  const markVerified = input.markDomainVerified !== false;

  const admin = createAdminClient();
  const baseSlug = input.slug?.trim()
    ? slugifyOrganizationName(input.slug)
    : slugifyOrganizationName(input.name);

  let org: Organization | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);
    const { data, error } = await admin
      .from("organizations")
      .insert({
        industry_id: input.industryId,
        name: input.name.trim(),
        slug,
        is_active: input.isActive ?? true,
        workspace_type: workspaceType,
        onboarding_status: "active",
        join_policy: joinPolicy,
      })
      .select(
        "id, name, slug, industry_id, is_active, workspace_type, onboarding_status, join_policy"
      )
      .single();

    if (!error && data) {
      org = data as Organization;
      break;
    }

    lastError = error?.message ?? "Failed to create organization";

    if (error?.code === "23505") {
      continue;
    }

    throw new Error(lastError);
  }

  if (!org) {
    throw new Error(lastError ?? "Failed to create organization");
  }

  if (!domain) {
    return { organization: org, domain: null };
  }

  try {
    const challenge = await ensureDomainVerificationChallenge({
      organizationId: org.id,
      domain,
    });

    if (markVerified) {
      const verified = await verifyOrganizationDomain({
        domainId: challenge.domain.id,
        method: "platform_admin",
      });
      return { organization: org, domain: verified };
    }

    return {
      organization: org,
      domain: {
        id: challenge.domain.id,
        organization_id: challenge.domain.organization_id,
        domain: challenge.domain.domain,
        verification_status: challenge.domain.verification_status,
        verification_method: challenge.domain.verification_method,
        verified_at: challenge.domain.verified_at,
      },
    };
  } catch (error) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw error;
  }
}

export async function createIndustry(
  input: CreateIndustryInput
): Promise<{ industry: Industry & { is_active?: boolean } }> {
  const admin = createAdminClient();
  const baseSlug = input.slug?.trim()
    ? slugifyOrganizationName(input.slug)
    : slugifyOrganizationName(input.name);

  let industry: (Industry & { is_active?: boolean }) | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);
    const { data, error } = await admin
      .from("industries")
      .insert({
        name: input.name.trim(),
        slug,
        is_active: input.isActive ?? true,
      })
      .select("id, name, slug, is_active")
      .single();

    if (!error && data) {
      industry = data as Industry & { is_active?: boolean };
      break;
    }

    lastError = error?.message ?? "Failed to create industry";
    if (error?.code === "23505") {
      continue;
    }
    throw new Error(lastError);
  }

  if (!industry) {
    throw new Error(lastError ?? "Failed to create industry");
  }

  return { industry };
}

export async function createIndustryWithOtherOrg(
  input: CreateIndustryInput
): Promise<{ industry: Industry & { is_active?: boolean } }> {
  return createIndustry(input);
}
