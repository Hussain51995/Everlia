import { createAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import { ensureDomainVerificationChallenge } from "@/lib/onboarding/domain-challenge";
import {
  slugifyOrganizationName,
  withSlugSuffix,
} from "@/lib/auth/slugify";
import type { Organization, OrganizationRequest } from "@/lib/types/auth";

export type DuplicateOrganizationHit = {
  organizationId: string;
  name: string;
  slug: string;
  onboardingStatus: string | null;
  isActive: boolean;
  matchedDomain: string;
};

export async function findDuplicateOrganizationsByDomain(params: {
  industryId: string;
  domain: string;
  excludeOrganizationId?: string;
}): Promise<DuplicateOrganizationHit[]> {
  const domain = extractEmailDomain(params.domain);
  if (!domain) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_domains")
    .select(
      `
      domain,
      verification_status,
      organization:organizations!inner (
        id,
        name,
        slug,
        industry_id,
        is_active,
        onboarding_status
      )
    `
    )
    .eq("domain", domain)
    .in("verification_status", ["pending", "verified"]);

  if (error) throw new Error(error.message);

  const hits: DuplicateOrganizationHit[] = [];
  for (const row of data ?? []) {
    const orgRaw = row.organization;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (!org) continue;
    if (org.industry_id !== params.industryId) continue;
    if (
      params.excludeOrganizationId &&
      org.id === params.excludeOrganizationId
    ) {
      continue;
    }
    hits.push({
      organizationId: org.id as string,
      name: org.name as string,
      slug: org.slug as string,
      onboardingStatus: (org.onboarding_status as string | null) ?? null,
      isActive: Boolean(org.is_active),
      matchedDomain: row.domain as string,
    });
  }
  return hits;
}

export async function createCompanyOrganizationDraft(params: {
  userId: string;
  industryId: string;
  name: string;
  domain: string;
  workspaceType?: "company" | "team";
  businessDetails?: Record<string, unknown>;
  failOnDuplicate?: boolean;
}): Promise<{
  organization: Organization;
  request: OrganizationRequest;
  domainChallenge: Awaited<
    ReturnType<typeof ensureDomainVerificationChallenge>
  >;
  duplicates: DuplicateOrganizationHit[];
}> {
  const admin = createAdminClient();
  const domain = extractEmailDomain(params.domain);
  if (!domain) {
    throw new Error("Company domain is required and must be valid");
  }

  const { data: industry, error: industryError } = await admin
    .from("industries")
    .select("id")
    .eq("id", params.industryId)
    .eq("is_active", true)
    .maybeSingle();
  if (industryError) throw new Error(industryError.message);
  if (!industry) throw new Error("Selected industry is invalid or inactive");

  const duplicates = await findDuplicateOrganizationsByDomain({
    industryId: params.industryId,
    domain,
  });

  if (params.failOnDuplicate !== false && duplicates.length > 0) {
    const verified = duplicates.filter((d) => d.isActive);
    if (verified.length > 0) {
      throw new Error(
        `An organization already uses domain ${domain}. Request to join it or contact support.`
      );
    }
  }

  const { data: existingRequest } = await admin
    .from("organization_requests")
    .select(
      "id, industry_id, requesting_user_id, requested_name, requested_domain, requested_workspace_type, status, reviewed_by, reviewed_at, resulting_organization_id, review_notes"
    )
    .eq("requesting_user_id", params.userId)
    .eq("industry_id", params.industryId)
    .eq("requested_domain", domain)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRequest?.resulting_organization_id) {
    const { data: org } = await admin
      .from("organizations")
      .select(
        "id, name, slug, industry_id, is_active, workspace_type, onboarding_status, join_policy, created_by"
      )
      .eq("id", existingRequest.resulting_organization_id)
      .maybeSingle();

    if (org) {
      const domainChallenge = await ensureDomainVerificationChallenge({
        organizationId: org.id as string,
        domain,
      });
      return {
        organization: org as Organization,
        request: existingRequest as OrganizationRequest,
        domainChallenge,
        duplicates,
      };
    }
  }

  const workspaceType = params.workspaceType ?? "company";
  const baseSlug = slugifyOrganizationName(params.name);
  let org: Organization | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);
    const { data, error } = await admin
      .from("organizations")
      .insert({
        industry_id: params.industryId,
        name: params.name.trim(),
        slug,
        is_active: false,
        workspace_type: workspaceType,
        onboarding_status: "pending",
        join_policy: "verified_domain",
        created_by: params.userId,
      })
      .select(
        "id, name, slug, industry_id, is_active, workspace_type, onboarding_status, join_policy, created_by"
      )
      .single();

    if (!error && data) {
      org = data as Organization;
      break;
    }
    lastError = error?.message ?? "Failed to create organization";
    if (error?.code === "23505") continue;
    throw new Error(lastError);
  }

  if (!org) {
    throw new Error(lastError ?? "Failed to create organization");
  }

  const { error: memberError } = await admin.rpc("assign_organization_owner", {
    p_organization_id: org.id,
    p_user_id: params.userId,
    p_status: "pending",
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(memberError.message);
  }

  const { data: request, error: requestError } = await admin
    .from("organization_requests")
    .insert({
      industry_id: params.industryId,
      requesting_user_id: params.userId,
      requested_name: params.name.trim(),
      requested_domain: domain,
      requested_workspace_type: workspaceType,
      status: "pending",
      resulting_organization_id: org.id,
      business_details: params.businessDetails ?? {},
    })
    .select(
      "id, industry_id, requesting_user_id, requested_name, requested_domain, requested_workspace_type, status, reviewed_by, reviewed_at, resulting_organization_id, review_notes"
    )
    .single();

  if (requestError || !request) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(requestError?.message ?? "Failed to create organization request");
  }

  let domainChallenge;
  try {
    domainChallenge = await ensureDomainVerificationChallenge({
      organizationId: org.id,
      domain,
    });
  } catch (error) {
    await admin.from("organization_requests").delete().eq("id", request.id);
    await admin.from("organizations").delete().eq("id", org.id);
    throw error;
  }

  return {
    organization: org,
    request: request as OrganizationRequest,
    domainChallenge,
    duplicates,
  };
}

export async function activateOrganizationAfterDomainVerification(params: {
  organizationId: string;
}): Promise<Organization> {
  const admin = createAdminClient();

  const { data: verifiedDomain, error: domainError } = await admin
    .from("organization_domains")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("verification_status", "verified")
    .limit(1)
    .maybeSingle();

  if (domainError) throw new Error(domainError.message);
  if (!verifiedDomain) {
    throw new Error("Organization has no verified domain yet");
  }

  const { data: org, error } = await admin
    .from("organizations")
    .update({
      is_active: true,
      onboarding_status: "active",
    })
    .eq("id", params.organizationId)
    .select(
      "id, name, slug, industry_id, is_active, workspace_type, onboarding_status, join_policy, created_by"
    )
    .single();

  if (error || !org) {
    throw new Error(error?.message ?? "Failed to activate organization");
  }

  await admin
    .from("organization_members")
    .update({ status: "active" })
    .eq("organization_id", params.organizationId)
    .eq("role", "owner")
    .eq("status", "pending");

  return org as Organization;
}

export async function setOrganizationActiveState(params: {
  organizationId: string;
  isActive: boolean;
  onboardingStatus?: "pending" | "active" | "rejected";
}): Promise<Organization> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    is_active: params.isActive,
  };
  if (params.onboardingStatus) {
    patch.onboarding_status = params.onboardingStatus;
  }

  const { data, error } = await admin
    .from("organizations")
    .update(patch)
    .eq("id", params.organizationId)
    .select(
      "id, name, slug, industry_id, is_active, workspace_type, onboarding_status, join_policy, created_by"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update organization");
  }
  return data as Organization;
}

export async function approveOrganizationRequestById(params: {
  requestId: string;
  reviewerId: string;
}): Promise<Organization> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("approve_organization_request", {
    p_request_id: params.requestId,
    p_reviewer_id: params.reviewerId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("Failed to approve organization request");
  return row as Organization;
}

export async function rejectOrganizationRequestById(params: {
  requestId: string;
  reviewerId: string;
  notes?: string;
}): Promise<OrganizationRequest> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reject_organization_request", {
    p_request_id: params.requestId,
    p_reviewer_id: params.reviewerId,
    p_notes: params.notes ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("Failed to reject organization request");

  if (row.resulting_organization_id) {
    await admin
      .from("organizations")
      .update({
        is_active: false,
        onboarding_status: "rejected",
      })
      .eq("id", row.resulting_organization_id)
      .eq("onboarding_status", "pending");
  }

  return row as OrganizationRequest;
}

export async function listOrganizationRequests(params?: {
  status?: string;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("organization_requests")
    .select(
      `
      id,
      industry_id,
      requesting_user_id,
      requested_name,
      requested_domain,
      requested_workspace_type,
      status,
      reviewed_by,
      reviewed_at,
      resulting_organization_id,
      review_notes,
      business_details,
      created_at,
      industry:industries ( id, name, slug )
    `
    )
    .order("created_at", { ascending: false });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
