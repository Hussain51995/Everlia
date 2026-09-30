import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { generatePasswordResetLink } from "@/lib/auth/email-verification";
import { isEmailVerificationEnabled } from "@/lib/auth/config";
import { sendPasswordResetEmail } from "@/lib/email/send";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid email"));
    }

    try {
      const resetUrl = await generatePasswordResetLink(parsed.data.email);

      if (isEmailVerificationEnabled()) {
        await sendPasswordResetEmail({
          to: parsed.data.email,
          resetUrl,
        });
        return apiSuccess({ sent: true, resetLink: null });
      }

      return apiSuccess({ sent: false, resetLink: resetUrl });
    } catch {
      return apiSuccess({ sent: true, resetLink: null });
    }
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to send reset email",
      },
      500
    );
  }
}
