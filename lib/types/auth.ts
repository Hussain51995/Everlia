export type OrganizationRole = "org_admin" | "member";
export type MembershipStatus = "active" | "inactive" | "suspended";

export type Industry = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  industry_id?: string;
  is_active?: boolean;
};

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

export type OrganizationMembership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MembershipStatus;
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

export type AuthUser = {
  id: string;
  email: string | null;
};

export type SessionPayload = {
  user: AuthUser;
  profile: Profile | null;
  membership: OrganizationMembership | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  isPlatformAdmin: boolean;
  canUseMemberOrganizations: boolean;
};

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
