import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email/send";

type EmailOtpType = "magiclink" | "recovery" | "signup" | "invite" | "email";

function buildCallbackUrl(params: {
  tokenHash: string;
  type: EmailOtpType;
  next: string;
}) {
  const url = new URL("/auth/callback", getAppUrl());
  url.searchParams.set("token_hash", params.tokenHash);
  url.searchParams.set("type", params.type);
  url.searchParams.set("next", params.next);
  return url.toString();
}

async function generateHashedLink(input: {
  email: string;
  type: "magiclink" | "recovery";
  next: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: input.type,
    email: input.email,
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(input.next)}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("Failed to generate email link token");
  }

  return buildCallbackUrl({
    tokenHash,
    type: input.type,
    next: input.next,
  });
}

export async function generateEmailVerificationLink(email: string) {
  return generateHashedLink({
    email,
    type: "magiclink",
    next: "/sign-in",
  });
}

export async function generatePasswordResetLink(email: string) {
  return generateHashedLink({
    email,
    type: "recovery",
    next: "/reset-password",
  });
}

export async function resendVerificationEmail(
  email: string,
  firstName?: string | null
) {
  const verifyUrl = await generateEmailVerificationLink(email);
  await sendVerificationEmail({
    to: email,
    verifyUrl,
    firstName,
  });
  return { verifyUrl };
}
