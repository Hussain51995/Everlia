import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { url, anonKey };
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  const isEmailVerificationFlow = next.startsWith("/sign-in");

  const redirectWithVerified = (status: "success" | "error") => {
    const url = new URL("/sign-in", origin);
    url.searchParams.set("verified", status);
    return NextResponse.redirect(url);
  };

  let response = isEmailVerificationFlow
    ? redirectWithVerified("success")
    : NextResponse.redirect(new URL(next, origin));

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let verifyError: { message: string } | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    verifyError = error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verifyError = error;
  } else {
    verifyError = { message: "Missing verification token" };
  }

  if (verifyError) {
    if (isEmailVerificationFlow) {
      return redirectWithVerified("error");
    }
    return NextResponse.redirect(
      new URL("/sign-in?error=auth_callback", origin)
    );
  }

  if (isEmailVerificationFlow) {
    await supabase.auth.signOut();
    return response;
  }

  return response;
}
