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
import { resendVerificationSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid email"));
    }

    if (isEmailVerificationEnabled()) {
      await resendVerificationEmail(parsed.data.email);
      return apiSuccess({ sent: true, verificationLink: null });
    }

    const verificationLink = await generateEmailVerificationLink(
      parsed.data.email
    );
    return apiSuccess({ sent: false, verificationLink });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resend email";
    return apiError(mapAuthError(message), 400);
  }
}
