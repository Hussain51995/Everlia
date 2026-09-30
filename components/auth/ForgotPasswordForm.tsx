"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MailIcon,
  CheckCircleIcon,
  ArrowIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from "@/components/ui/Icons";
import { useForgotPassword } from "@/hooks/auth";
import { ApiClientError } from "@/lib/api/client";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFormError(firstZodError(parsed.error, "Enter a valid email"));
      return;
    }

    forgotPassword.mutate(parsed.data, {
      onSuccess: (data) => {
        setResetLink(data.resetLink);
        setSubmitted(true);
      },
      onError: (error) => {
        setFormError(
          error instanceof ApiClientError
            ? error.message
            : "Unable to send reset email. Please try again."
        );
      },
    });
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 py-2 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
          <CheckCircleIcon className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-[#0B1F3D]">
            {resetLink ? "Reset Link Ready" : "Reset Link Dispatched"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#557393]">
            {resetLink ? (
              <>
                Email delivery is off for this environment. Use the link below
                for{" "}
                <span className="font-bold text-[#0B1F3D]">{email}</span>.
              </>
            ) : (
              <>
                We sent a secure password reset link to{" "}
                <span className="font-bold text-[#0B1F3D]">{email}</span>. Please
                check your inbox and spam folder.
              </>
            )}
          </p>
        </div>

        {resetLink ? (
          <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
              Dev reset link
            </p>
            <a
              href={resetLink}
              className="mt-1 block break-all text-xs font-semibold text-[#38B2D1] hover:underline"
            >
              {resetLink}
            </a>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-[#C4EBF2] pt-3">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setResetLink(null);
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 text-xs font-bold text-[#0B1F3D] transition-all hover:bg-white"
          >
            <RefreshCwIcon className="h-3.5 w-3.5 text-[#38B2D1]" />
            Resend Email Link
          </button>
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#2ca0be]"
          >
            Return to Sign In
          </Link>
        </div>
      </motion.div>
    );
  }

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
          Account Email Address
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
            placeholder="sarah@compassrealty.com"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={forgotPassword.isPending}
        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-6 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] hover:shadow-xl active:scale-[0.99] disabled:opacity-70"
      >
        {forgotPassword.isPending ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <span>Send Instructions</span>
            <ArrowIcon className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="pt-2 text-center text-xs font-medium text-[#557393]">
        Remember your password?{" "}
        <Link href="/sign-in" className="font-bold text-[#38B2D1] hover:underline">
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
