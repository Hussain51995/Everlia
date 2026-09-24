"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowIcon, SparklesIcon } from "@/components/ui/Icons";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("sarah.realtor@homelink.com");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setEmail("sarah.realtor@homelink.com");
    setPassword("demopassword123");
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={handleDemoLogin}
        className="w-full flex items-center justify-between rounded-2xl border border-[#38B2D1]/30 bg-[#38B2D1]/10 px-4 py-3 text-xs font-semibold text-[#0B1F3D] transition-all hover:bg-[#38B2D1]/20 hover:border-[#38B2D1]"
      >
        <span className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-[#38B2D1]" />
          <span>Quick Demo Access (Agent Account)</span>
        </span>
        <span className="rounded-lg bg-[#38B2D1] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
          One-Click
        </span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#C4EBF2]" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-[#557393]">
          Or sign in with email
        </div>
      </div>

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
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="remember"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-[#C4EBF2] text-[#38B2D1] focus:ring-[#38B2D1]"
        />
        <label htmlFor="remember" className="ml-2 text-xs font-medium text-[#557393]">
          Keep me signed in on this browser
        </label>
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
            <span>Sign In to CRM</span>
            <ArrowIcon className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="pt-2 text-center text-xs font-medium text-[#557393]">
        Don&apos;t have a HomeLink account yet?{" "}
        <Link href="/sign-up" className="font-bold text-[#38B2D1] hover:underline">
          Create Account
        </Link>
      </div>
    </form>
  );
}
