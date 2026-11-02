
export type OrganizationRole = "owner" | "admin" | "member" | "org_admin";

export type MembershipStatus =
  | "pending"
  | "active"
  | "rejected"
  | "inactive"
  | "suspended";

export type OrganizationWorkspaceType = "company" | "team" | "independent";
export type OrganizationOnboardingStatus = "pending" | "active" | "rejected";
export type OrganizationJoinPolicy =
  | "invite_only"
  | "approval_required"
  | "verified_domain";

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
  workspace_type?: OrganizationWorkspaceType;
  onboarding_status?: OrganizationOnboardingStatus;
  join_policy?: OrganizationJoinPolicy;
  created_by?: string | null;
  is_system_other?: boolean;
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

export type DomainVerificationStatus = "pending" | "verified" | "rejected";
export type DomainVerificationMethod =
  | "dns_txt"
  | "email"
  | "manual"
  | "platform_admin";

export type OrganizationDomain = {
  id: string;
  organization_id: string;
  domain: string;
  verification_status: DomainVerificationStatus;
  verification_method: DomainVerificationMethod | null;
  verified_at: string | null;
  verification_token?: string | null;
  txt_record_host?: string | null;
  txt_record_value?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type OrganizationRequest = {
  id: string;
  industry_id: string;
  requesting_user_id: string;
  requested_name: string;
  requested_domain: string | null;
  requested_workspace_type: Extract<
    OrganizationWorkspaceType,
    "company" | "team"
  >;
  status: OrganizationRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_organization_id: string | null;
  review_notes: string | null;
  business_details?: Record<string, unknown>;
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
