import { createClient } from "@/lib/supabase/server";
import { apiError, unauthorizedError } from "@/lib/api/response";
import { getSessionPayload } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/types/auth";
import type { User } from "@supabase/supabase-js";

export type OrgContext = {
  user: User;
  session: SessionPayload;
  organizationId: string;
  industryId: string | null;
};

export async function requireActiveOrganization(): Promise<
  OrgContext | { response: Response }
> {
  const session = await getSessionPayload();

  if (!session?.user) {
    return { response: unauthorizedError() };
  }

  if (session.isPlatformAdmin || !session.canUseMemberOrganizations) {
    return {
      response: apiError(
        {
          code: "ORG_REQUIRED",
          message: "An active organization membership is required",
        },
        403
      ),
    };
  }

  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return {
      response: apiError(
        {
          code: "ORG_REQUIRED",
          message: "Select an active organization to continue",
        },
        403
      ),
    };
  }

  const membership =
    session.memberships.find((m) => m.organization_id === organizationId) ??
    null;

  if (!membership) {
    return {
      response: apiError(
        {
          code: "ORG_FORBIDDEN",
          message: "You are not a member of this organization",
        },
        403
      ),
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: unauthorizedError() };
  }

  return {
    user,
    session,
    organizationId,
    industryId: membership.organization?.industry_id ?? null,
  };
}
