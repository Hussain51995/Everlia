import { createAdminClient } from "@/lib/supabase/admin";
import { isPersonalEmailDomain } from "@/lib/onboarding/personal-email-domains";
import { normalizeEmailAndDomain } from "@/lib/onboarding/normalize-email";
import {
  buildDiscoveryResult,
  sortDiscoverableOrganizations,
} from "@/lib/onboarding/discovery-result";
import type {
  DiscoverableOrganizationSummary,
  DiscoveryResult,
} from "@/lib/types/onboarding";
import type {
  OrganizationJoinPolicy,
  OrganizationWorkspaceType,
} from "@/lib/types/auth";

export type DiscoverOrganizationsParams = {
  industryId: string;
  email: string;
};

async function assertActiveIndustry(industryId: string): Promise<void> {
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

type RpcRow = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  industry_id: string;
  workspace_type: OrganizationWorkspaceType;
  join_policy: OrganizationJoinPolicy;
  domain: string;
};

async function queryVerifiedMatches(
  domain: string,
  industryId: string
): Promise<DiscoverableOrganizationSummary[]> {
  const admin = createAdminClient();

  const { data: rpcData, error: rpcError } = await admin.rpc(
    "discover_organizations_by_verified_domain",
    {
      p_domain: domain,
      p_industry_id: industryId,
    }
  );

  if (!rpcError && Array.isArray(rpcData)) {
    return (rpcData as RpcRow[]).map((row) => ({
      id: row.organization_id,
      name: row.organization_name,
      slug: row.organization_slug,
      industryId: row.industry_id,
      workspaceType: row.workspace_type,
      joinPolicy: row.join_policy,
      matchedDomain: row.domain,
    }));
  }

  const { data, error } = await admin
    .from("organization_domains")
    .select(
      `
      domain,
      organization:organizations!inner (
        id,
        name,
        slug,
        industry_id,
        workspace_type,
        join_policy,
        is_active,
        onboarding_status
      )
    `
    )
    .eq("domain", domain)
    .eq("verification_status", "verified");

  if (error) {
    throw new Error(
      rpcError?.message
        ? `${rpcError.message}; fallback: ${error.message}`
        : error.message
    );
  }

  const summaries: DiscoverableOrganizationSummary[] = [];

  for (const row of data ?? []) {
    const orgRaw = row.organization;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (!org) continue;
    if (org.industry_id !== industryId) continue;
    if (!org.is_active) continue;
    if (org.onboarding_status !== "active") continue;
    if (org.workspace_type !== "company" && org.workspace_type !== "team") {
      continue;
    }

    summaries.push({
      id: org.id as string,
      name: org.name as string,
      slug: org.slug as string,
      industryId: org.industry_id as string,
      workspaceType: org.workspace_type as OrganizationWorkspaceType,
      joinPolicy: org.join_policy as OrganizationJoinPolicy,
      matchedDomain: row.domain as string,
    });
  }

  return sortDiscoverableOrganizations(summaries);
}

export async function discoverOrganizations(
  params: DiscoverOrganizationsParams
): Promise<DiscoveryResult> {
  const normalized = normalizeEmailAndDomain(params.email);
  if (!normalized) {
    return buildDiscoveryResult({
      email: null,
      domain: null,
      isPersonal: false,
      matches: [],
    });
  }

  await assertActiveIndustry(params.industryId);

  if (isPersonalEmailDomain(normalized.domain)) {
    return buildDiscoveryResult({
      email: normalized.email,
      domain: normalized.domain,
      isPersonal: true,
      matches: [],
    });
  }

  const matches = await queryVerifiedMatches(
    normalized.domain,
    params.industryId
  );

  return buildDiscoveryResult({
    email: normalized.email,
    domain: normalized.domain,
    isPersonal: false,
    matches,
  });
}

export async function assertDiscoverableOrganization(params: {
  industryId: string;
  email: string;
  organizationId: string;
}): Promise<DiscoverableOrganizationSummary> {
  const result = await discoverOrganizations({
    industryId: params.industryId,
    email: params.email,
  });

  if (
    result.state !== "single_match" &&
    result.state !== "multiple_matches"
  ) {
    throw new Error("Organization is not eligible for domain-based joining");
  }

  const match = result.organizations.find(
    (org) => org.id === params.organizationId
  );
  if (!match) {
    throw new Error("Organization is not eligible for domain-based joining");
  }

  return match;
}
