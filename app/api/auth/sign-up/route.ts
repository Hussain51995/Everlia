import {
  apiError,
  apiSuccess,
  mapAuthError,
  validationError,
} from "@/lib/api/response";
import { isEmailVerificationEnabled } from "@/lib/auth/config";
import {
  generateEmailVerificationLink,
  resendVerificationEmail,
} from "@/lib/auth/email-verification";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertActiveOrganization } from "@/lib/auth/join-organization";
import { signUpSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid signup data"));
    }

    const { email, password, firstName, lastName, phone, organizationId } =
      parsed.data;

    await assertActiveOrganization(organizationId);

    const emailVerificationEnabled = isEmailVerificationEnabled();
    const metadata: Record<string, string | boolean | null> = {
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      organization_id: organizationId,
    };

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: metadata,
    });

    if (error) {
      return apiError(mapAuthError(error.message), 400);
    }

    let verificationLink: string | null = null;

    if (emailVerificationEnabled) {
      await resendVerificationEmail(email, firstName);
    } else {
      verificationLink = await generateEmailVerificationLink(email);
    }

    return apiSuccess({
      user: data.user
        ? { id: data.user.id, email: data.user.email ?? null }
        : null,
      session: null,
      requiresEmailConfirmation: true,
      emailVerificationEnabled,
      verificationLink,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Sign up failed",
      },
      500
    );
  }
}
