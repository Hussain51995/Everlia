import { createAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import type { OrganizationJoinPolicy } from "@/lib/types/auth";

export type ActivatedMembership = {
  organizationId: string;
  membershipId: string;
  activated: boolean;
  reason: string;
};

export async function activatePendingMembershipsForVerifiedUser(params: {
  userId: string;
  userEmail: string | null;
}): Promise<ActivatedMembership[]> {
  const admin = createAdminClient();
  const domain = extractEmailDomain(params.userEmail ?? "");

  const { data: pendingRows, error } = await admin
    .from("organization_members")
    .select(
      `
      id,
      organization_id,
      status,
      organization:organizations (
        id,
        join_policy,
        is_active,
        onboarding_status
      )
    `
    )
    .eq("user_id", params.userId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  const results: ActivatedMembership[] = [];

  for (const row of pendingRows ?? []) {
    const orgRaw = row.organization;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (!org || !org.is_active || org.onboarding_status !== "active") {
      results.push({
        organizationId: row.organization_id as string,
        membershipId: row.id as string,
        activated: false,
        reason: "organization_inactive",
      });
      continue;
    }

    const policy = org.join_policy as OrganizationJoinPolicy;

    if (policy === "approval_required") {
      results.push({
        organizationId: row.organization_id as string,
        membershipId: row.id as string,
        activated: false,
        reason: "awaiting_admin_approval",
      });
      continue;
    }

    if (policy === "verified_domain") {
      const { data: verifiedDomains, error: domainsError } = await admin
        .from("organization_domains")
        .select("id, domain")
        .eq("organization_id", row.organization_id)
        .eq("verification_status", "verified");

      if (domainsError) throw new Error(domainsError.message);

      const hasVerifiedDomains = (verifiedDomains?.length ?? 0) > 0;
      if (!hasVerifiedDomains) {
        results.push({
          organizationId: row.organization_id as string,
          membershipId: row.id as string,
          activated: false,
          reason: "domain_verification_required",
        });
        continue;
      }

      if (!domain) {
        results.push({
          organizationId: row.organization_id as string,
          membershipId: row.id as string,
          activated: false,
          reason: "missing_email_domain",
        });
        continue;
      }

      const matched = verifiedDomains!.some((d) => d.domain === domain);
      if (!matched) {
        results.push({
          organizationId: row.organization_id as string,
          membershipId: row.id as string,
          activated: false,
          reason: "domain_mismatch",
        });
        continue;
      }
    }

    const { error: updateError } = await admin
      .from("organization_members")
      .update({ status: "active" })
      .eq("id", row.id)
      .eq("status", "pending");

    if (updateError) {
      throw new Error(updateError.message);
    }

    results.push({
      organizationId: row.organization_id as string,
      membershipId: row.id as string,
      activated: true,
      reason: "verified_identity",
    });
  }

  return results;
}
