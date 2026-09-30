"use client";

import Link from "next/link";
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowIcon,
  AlertCircleIcon,
} from "@/components/ui/Icons";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSignIn } from "@/hooks/auth";
import { ApiClientError } from "@/lib/api/client";
import { signInSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { useToast } from "@/components/ui/Toast";

export function SignInForm() {
  const signIn = useSignIn();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const handledVerified = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (!verified || handledVerified.current) return;
    handledVerified.current = true;

    if (verified === "success") {
      showToast({
        tone: "success",
        title: "Email verified",
        description: "Your email is confirmed. You can sign in now.",
      });
    } else if (verified === "error") {
      showToast({
        tone: "error",
        title: "Verification failed",
        description:
          "That confirmation link is invalid or expired. Request a new one from sign-up.",
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("verified");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [searchParams, showToast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(firstZodError(parsed.error, "Invalid form data"));
      return;
    }

    signIn.mutate(parsed.data, {
      onError: (error) => {
        setFormError(
          error instanceof ApiClientError
            ? error.message
            : "Unable to sign in. Please try again."
        );
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Email Address
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <MailIcon className="h-4 w-4" />
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@brokerage.com"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-[#38B2D1] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <LockIcon className="h-4 w-4" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-11 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#557393] hover:text-[#0B1F3D]"
          >
            {showPassword ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={signIn.isPending}
        className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-6 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] hover:shadow-xl active:scale-[0.99] disabled:opacity-70"
      >
        {signIn.isPending ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <span>Sign In to CRM</span>
            <ArrowIcon className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="pt-2 text-center text-xs font-medium text-[#557393]">
        Don&apos;t have an Everlia account yet?{" "}
        <Link href="/sign-up" className="font-bold text-[#38B2D1] hover:underline">
          Create Account
        </Link>
      </div>
    </form>
  );
}
