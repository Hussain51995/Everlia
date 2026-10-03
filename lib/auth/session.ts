import { createClient } from "@/lib/supabase/server";
import { getActiveOrganizationIdFromCookie } from "@/lib/auth/active-organization";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import type {
  OrganizationMembership,
  Profile,
  SessionPayload,
} from "@/lib/types/auth";

export { getAppUrl } from "@/lib/app-url";

type MembershipRow = OrganizationMembership & {
  organization?: {
    id: string;
    name: string;
    slug: string;
    industry_id?: string;
    industry?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

function normalizeMembership(row: MembershipRow): OrganizationMembership {
  const organization = row.organization
    ? {
        id: row.organization.id,
        name: row.organization.name,
        slug: row.organization.slug,
        industry_id: row.organization.industry_id,
        industry: row.organization.industry ?? null,
      }
    : null;

  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    status: row.status,
    organization,
  };
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const platformAdmin = await isPlatformAdmin(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (platformAdmin) {
    return {
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      profile: (profile as Profile | null) ?? null,
      membership: null,
      memberships: [],
      activeOrganizationId: null,
      isPlatformAdmin: true,
      canUseMemberOrganizations: false,
    };
  }

  const { data: membershipRows } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      organization_id,
      user_id,
      role,
      status,
      organization:organizations (
        id,
        name,
        slug,
        industry_id,
        industry:industries (
          id,
          name,
          slug
        )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const memberships = ((membershipRows as MembershipRow[] | null) ?? []).map(
    normalizeMembership
  );

  const cookieOrgId = getActiveOrganizationIdFromCookie();
  const activeFromCookie = cookieOrgId
    ? memberships.find((m) => m.organization_id === cookieOrgId) ?? null
    : null;
  const activeMembership = activeFromCookie ?? memberships[0] ?? null;

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: (profile as Profile | null) ?? null,
    membership: activeMembership,
    memberships,
    activeOrganizationId: activeMembership?.organization_id ?? null,
    isPlatformAdmin: false,
    canUseMemberOrganizations: true,
  };
}
