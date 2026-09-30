import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization, OrganizationMembership } from "@/lib/types/auth";

export async function assertActiveOrganization(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, name, slug, industry_id, is_active, industries(id, is_active)")
    .eq("id", organizationId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const industry = Array.isArray(data?.industries)
    ? data?.industries[0]
    : data?.industries;

  if (!data || !industry || industry.is_active !== true) {
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
  organizationId: string
): Promise<{
  membership: OrganizationMembership;
  organization: Organization;
  alreadyMember: boolean;
}> {
  const organization = await assertActiveOrganization(organizationId);
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return {
      membership: existing as OrganizationMembership,
      organization,
      alreadyMember: true,
    };
  }

  const { data, error } = await admin
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role: "member",
      status: "active",
    })
    .select("id, organization_id, user_id, role, status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to join organization");
  }

  return {
    membership: data as OrganizationMembership,
    organization,
    alreadyMember: false,
  };
}
