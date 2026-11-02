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
import { ensureDomainVerificationChallenge } from "@/lib/onboarding/domain-challenge";
import { firstZodError } from "@/lib/validations/errors";
import { uuidSchema } from "@/lib/validations/auth";
import { z } from "zod";

type RouteContext = { params: { id: string } };

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedError();
    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid organization id");
    if (!(await canManageOrg(user.id, idParsed.data))) {
      return apiError({ code: "FORBIDDEN", message: "Not allowed" }, 403);
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organization_domains")
      .select(
        "id, organization_id, domain, verification_status, verification_method, verified_at, txt_record_host, txt_record_value, created_at, updated_at"
      )
      .eq("organization_id", idParsed.data)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError({ code: "FETCH_FAILED", message: error.message }, 500);
    }

    return apiSuccess(data ?? []);
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to list domains",
      },
      500
    );
  }
}

const createSchema = z.object({
  domain: z.string().trim().min(3).max(253),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedError();
    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid organization id");
    if (!(await canManageOrg(user.id, idParsed.data))) {
      return apiError({ code: "FORBIDDEN", message: "Not allowed" }, 403);
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid domain"));
    }

    const result = await ensureDomainVerificationChallenge({
      organizationId: idParsed.data,
      domain: parsed.data.domain,
    });

    return apiSuccess({
      domain: {
        id: result.domain.id,
        organizationId: result.domain.organization_id,
        domain: result.domain.domain,
        verificationStatus: result.domain.verification_status,
        verifiedAt: result.domain.verified_at,
      },
      challenge: result.challenge,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to add domain",
      },
      400
    );
  }
}
