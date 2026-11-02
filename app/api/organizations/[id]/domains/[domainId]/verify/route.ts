import {
  apiError,
  apiSuccess,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import {
  getAuthenticatedUser,
  isPlatformAdmin,
} from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyDomainDnsChallenge } from "@/lib/onboarding/domain-challenge";
import { activateOrganizationAfterDomainVerification } from "@/lib/onboarding/organization-lifecycle";
import { uuidSchema } from "@/lib/validations/auth";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";


type RouteContext = { params: { id: string; domainId: string } };

async function canManageOrg(userId: string, organizationId: string) {
  if (await isPlatformAdmin(userId)) return true;
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (
    data?.role === "owner" ||
    data?.role === "admin" ||
    data?.role === "org_admin"
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedError();

    const orgParsed = uuidSchema.safeParse(context.params.id);
    const domainParsed = uuidSchema.safeParse(context.params.domainId);
    if (!orgParsed.success || !domainParsed.success) {
      return validationError("Invalid organization or domain id");
    }

    if (!(await canManageOrg(user.id, orgParsed.data))) {
      return apiError({ code: "FORBIDDEN", message: "Not allowed" }, 403);
    }

    const limit = checkRateLimit({
      key: `onboarding:dns-verify:${getClientIp(request)}:${orgParsed.data}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        { code: "RATE_LIMITED", message: "Too many DNS verification attempts." },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const admin = createAdminClient();
    const { data: domainRow } = await admin
      .from("organization_domains")
      .select("id, organization_id")
      .eq("id", domainParsed.data)
      .maybeSingle();

    if (!domainRow || domainRow.organization_id !== orgParsed.data) {
      return apiError({ code: "NOT_FOUND", message: "Domain not found" }, 404);
    }

    const domain = await verifyDomainDnsChallenge({
      organizationDomainId: domainParsed.data,
    });

    let organization = null;
    if (domain.verification_status === "verified") {
      organization = await activateOrganizationAfterDomainVerification({
        organizationId: orgParsed.data,
      });
    }

    return apiSuccess({
      domain: {
        id: domain.id,
        organizationId: domain.organization_id,
        domain: domain.domain,
        verificationStatus: domain.verification_status,
        verifiedAt: domain.verified_at,
        method: domain.verification_method,
      },
      organization,
      nextStep:
        domain.verification_status === "verified"
          ? "await_admin_request_clearance"
          : "retry_dns",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "DNS verification failed",
      },
      400
    );
  }
}
