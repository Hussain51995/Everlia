import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionPayload } from "@/lib/types/auth";

export function isOrgAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "org_admin";
}

export function sessionIsOrgAdmin(
  session: SessionPayload,
  organizationId: string
): boolean {
  const membership = session.memberships.find(
    (m) => m.organization_id === organizationId && m.status === "active"
  );
  return isOrgAdminRole(membership?.role);
}

export async function assertCampaignLifecycleAdmin(params: {
  organizationId: string;
  actorUserId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", params.organizationId)
    .eq("user_id", params.actorUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!isOrgAdminRole(data?.role)) {
    throw new Error("Only organization owners and admins can manage campaign lifecycle");
  }
}
