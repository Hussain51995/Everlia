import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  resendVerificationEmail,
} from "@/lib/auth/email-verification";
import { getAppUrl } from "@/lib/auth/session";

export function generateTemporaryPassword() {
  return randomBytes(32).toString("base64url");
}

export function getSetupPasswordRedirectUrl() {
  return `${getAppUrl()}/auth/callback?next=${encodeURIComponent("/setup-password")}`;
}

type CreatePendingUserInput = {
  email: string;
  metadata: Record<string, string | boolean | null>;
  emailVerificationEnabled: boolean;
};

export async function createPendingUser(input: CreatePendingUserInput) {
  const admin = createAdminClient();
  const redirectTo = getSetupPasswordRedirectUrl();
  const metadata = {
    ...input.metadata,
    needs_password_setup: true,
  };

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: generateTemporaryPassword(),
      email_confirm: !input.emailVerificationEnabled,
      user_metadata: metadata,
    });

  if (createError) {
    throw new Error(createError.message);
  }

  if (input.emailVerificationEnabled) {
    await resendVerificationEmail(input.email);

    return {
      user: created.user,
      requiresEmailConfirmation: true as const,
      sessionEstablished: false as const,
    };
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: input.email,
      options: { redirectTo },
    });

  if (linkError) {
    throw new Error(linkError.message);
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("Failed to establish setup session");
  }

  const supabase = createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError) {
    throw new Error(verifyError.message);
  }

  return {
    user: created.user,
    requiresEmailConfirmation: false as const,
    sessionEstablished: true as const,
  };
}

export { resendVerificationEmail };
