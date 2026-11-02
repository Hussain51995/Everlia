import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizationMembership } from "@/lib/types/auth";

async function assertOrgAdmin(params: {
  organizationId: string;
  actorUserId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", params.organizationId)
    .eq("user_id", params.actorUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);

  const role = data?.role;
  const allowed =
    role === "owner" || role === "admin" || role === "org_admin";

  if (!allowed) {
    const { data: platform } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", params.actorUserId)
      .maybeSingle();
    if (!platform) {
      throw new Error("Forbidden");
    }
  }
}

export async function listPendingMemberships(params: {
  organizationId: string;
  actorUserId: string;
}) {
  await assertOrgAdmin(params);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("organization_members")
    .select(
      `
      id,
      organization_id,
      user_id,
      role,
      status,
      created_at,
      profile:profiles!organization_members_user_id_fkey (
        first_name,
        last_name
      )
    `
    )
    .eq("organization_id", params.organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    const fallback = await admin
      .from("organization_members")
      .select("id, organization_id, user_id, role, status, created_at")
      .eq("organization_id", params.organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data ?? [];
  }

  return data ?? [];
}

export async function approvePendingMembership(params: {
  organizationId: string;
  membershipId: string;
  actorUserId: string;
}): Promise<OrganizationMembership> {
  await assertOrgAdmin(params);
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .eq("id", params.membershipId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Membership not found");

  if (row.status === "active") {
    return row as OrganizationMembership;
  }

  if (row.status !== "pending") {
    throw new Error("Only pending memberships can be approved");
  }

  const { data, error: updateError } = await admin
    .from("organization_members")
    .update({ status: "active" })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id, organization_id, user_id, role, status")
    .single();

  if (updateError || !data) {
    throw new Error(updateError?.message ?? "Failed to approve membership");
  }

  return data as OrganizationMembership;
}

export async function rejectPendingMembership(params: {
  organizationId: string;
  membershipId: string;
  actorUserId: string;
}): Promise<OrganizationMembership> {
  await assertOrgAdmin(params);
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .eq("id", params.membershipId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Membership not found");

  if (row.status === "rejected") {
    return row as OrganizationMembership;
  }

  if (row.status !== "pending") {
    throw new Error("Only pending memberships can be rejected");
  }

  if (row.role === "owner") {
    throw new Error("Cannot reject an organization owner membership");
  }

  const { data, error: updateError } = await admin
    .from("organization_members")
    .update({ status: "rejected" })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id, organization_id, user_id, role, status")
    .single();

  if (updateError || !data) {
    throw new Error(updateError?.message ?? "Failed to reject membership");
  }

  return data as OrganizationMembership;
}
