import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrganizationMembership } from "@/lib/onboarding/membership";
import type { Organization, OrganizationMembership } from "@/lib/types/auth";

export async function assertActiveOrganization(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "id, name, slug, industry_id, is_active, onboarding_status, industries(id, is_active)"
    )
    .eq("id", organizationId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const industry = Array.isArray(data?.industries)
    ? data?.industries[0]
    : data?.industries;

  if (
    !data ||
    !industry ||
    industry.is_active !== true ||
    (data.onboarding_status != null && data.onboarding_status !== "active")
  ) {
    throw new Error("Selected organization is invalid or inactive");
  }

  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    industry_id: data.industry_id as string,
    is_active: data.is_active as boolean,
  } satisfies Organization;
}

export async function joinOrganizationAsMember(
  userId: string,
  organizationId: string,
  invitationToken?: string
): Promise<{
  membership: OrganizationMembership;
  organization: Organization;
  alreadyMember: boolean;
}> {
  const result = await requestOrganizationMembership({
    userId,
    organizationId,
    invitationToken,
  });

  if (
    result.activation === "invitation_required" ||
    result.activation === "domain_mismatch"
  ) {
    throw new Error(result.message);
  }

  const organization = await assertActiveOrganization(organizationId);

  if (!result.membershipId || !result.membershipStatus) {
    throw new Error(result.message);
  }

  return {
    membership: {
      id: result.membershipId,
      organization_id: result.organizationId,
      user_id: userId,
      role: "member",
      status: result.membershipStatus,
    },
    organization,
    alreadyMember: result.activation === "already_member",
  };
}
