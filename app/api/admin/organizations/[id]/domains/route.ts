import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDomainVerificationChallenge } from "@/lib/onboarding/domain-challenge";
import { verifyOrganizationDomain } from "@/lib/onboarding/domain-verification";
import { activateOrganizationAfterDomainVerification } from "@/lib/onboarding/organization-lifecycle";
import { uuidSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid organization id");

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
        message:
          error instanceof Error ? error.message : "Failed to list domains",
      },
      500
    );
  }
}

const createSchema = z.object({
  domain: z.string().trim().min(3).max(253),
  markVerified: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid organization id");

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid domain"));
    }

    const challenge = await ensureDomainVerificationChallenge({
      organizationId: idParsed.data,
      domain: parsed.data.domain,
    });

    if (parsed.data.markVerified) {
      const verified = await verifyOrganizationDomain({
        domainId: challenge.domain.id,
        method: "platform_admin",
      });

      let organization = null;
      try {
        organization = await activateOrganizationAfterDomainVerification({
          organizationId: idParsed.data,
        });
      } catch {
        organization = null;
      }

      return apiSuccess({
        domain: verified,
        organization,
        challenge: null,
        adminVerified: true,
      });
    }

    return apiSuccess({
      domain: {
        id: challenge.domain.id,
        organizationId: challenge.domain.organization_id,
        domain: challenge.domain.domain,
        verificationStatus: challenge.domain.verification_status,
        verifiedAt: challenge.domain.verified_at,
      },
      challenge: challenge.challenge,
      adminVerified: false,
    });
  } catch (error) {
    return apiError(
      {
        code: "DOMAIN_UPSERT_FAILED",
        message:
          error instanceof Error ? error.message : "Failed to manage domain",
      },
      400
    );
  }
}
