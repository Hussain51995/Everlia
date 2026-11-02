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
import { createCompanyOrganizationDraft } from "@/lib/onboarding/organization-lifecycle";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";
import { uuidSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

const schema = z.object({
  industryId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  domain: z.string().trim().min(3).max(253),
  workspaceType: z.enum(["company", "team"]).default("company"),
  businessDetails: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedError();
    if (await isPlatformAdmin(user.id)) {
      return apiError(
        {
          code: "PLATFORM_ADMIN_FORBIDDEN",
          message: "Use the admin console to create organizations",
        },
        403
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid organization data"));
    }

    const limit = checkRateLimit({
      key: `onboarding:create-org:${getClientIp(request)}:${user.id}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        { code: "RATE_LIMITED", message: "Too many organization create attempts." },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await createCompanyOrganizationDraft({
      userId: user.id,
      industryId: parsed.data.industryId,
      name: parsed.data.name,
      domain: parsed.data.domain,
      workspaceType: parsed.data.workspaceType,
      businessDetails: parsed.data.businessDetails,
      failOnDuplicate: true,
    });

    return apiSuccess({
      organization: result.organization,
      request: result.request,
      domainChallenge: {
        domainId: result.domainChallenge.domain.id,
        domain: result.domainChallenge.domain.domain,
        host: result.domainChallenge.challenge.host,
        value: result.domainChallenge.challenge.value,
        instructions: result.domainChallenge.challenge.instructions,
        verificationStatus: result.domainChallenge.domain.verification_status,
      },
      duplicates: result.duplicates,
      nextStep: "verify_domain_dns",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create organization",
      },
      400
    );
  }
}
