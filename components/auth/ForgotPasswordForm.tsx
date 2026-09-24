"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MailIcon, CheckCircleIcon, ArrowIcon, RefreshCwIcon } from "@/components/ui/Icons";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 py-2"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircleIcon className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-[#0B1F3D]">Reset Link Dispatched</h3>
          <p className="mt-1 text-xs text-[#557393] leading-relaxed">
            We sent a secure password reset link to{" "}
            <span className="font-bold text-[#0B1F3D]">{email || "your email"}</span>. Please check your inbox and spam folder.
          </p>
        </div>

        <div className="pt-3 border-t border-[#C4EBF2] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 text-xs font-bold text-[#0B1F3D] hover:bg-white transition-all"
          >
            <RefreshCwIcon className="h-3.5 w-3.5 text-[#38B2D1]" />
            Resend Email Link
          </button>
          <Link
            href="/sign-in"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] py-3 text-xs font-bold text-white shadow-md hover:bg-[#2ca0be] transition-all"
          >
            Return to Sign In
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@compassrealty.com"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-6 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] hover:shadow-xl active:scale-[0.99] disabled:opacity-70"
      >
        {loading ? (
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
