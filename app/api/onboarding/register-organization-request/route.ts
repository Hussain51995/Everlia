import {
  apiError,
  apiSuccess,
  mapAuthError,
  validationError,
} from "@/lib/api/response";
import { registerOrganizationRequestAccount } from "@/lib/onboarding/register-account";
import {
  checkRateLimit,
  getClientIp,
  hashRateLimitIdentity,
} from "@/lib/onboarding/rate-limit";
import { emailSchema, passwordSchema, uuidSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

const schema = z.object({
  industryId: uuidSchema,
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organizationName: z.string().trim().min(2).max(120),
  domain: z.string().trim().max(253).optional().or(z.literal("")),
  workspaceType: z.enum(["company", "team"]).default("company"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid registration data"));
    }

    const email = parsed.data.email.trim().toLowerCase();
    const limit = checkRateLimit({
      key: `onboarding:register-org-request:${getClientIp(request)}:${await hashRateLimitIdentity(email)}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        { code: "RATE_LIMITED", message: "Too many registration attempts." },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await registerOrganizationRequestAccount({
      industryId: parsed.data.industryId,
      email,
      password: parsed.data.password,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || undefined,
      organizationName: parsed.data.organizationName,
      domain: parsed.data.domain || undefined,
      workspaceType: parsed.data.workspaceType,
    });

    return apiSuccess({
      ...result,
      session: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return apiError(mapAuthError(message), 400);
  }
}
