"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, UserIcon, BuildingIcon, ArrowIcon, CheckIcon } from "@/components/ui/Icons";

const TIERS = [
  { id: "solo", label: "Solo Agent", desc: "Up to 500 contacts" },
  { id: "team", label: "Team Leader", desc: "Up to 2,500 contacts" },
  { id: "brokerage", label: "Brokerage", desc: "Unlimited contacts" },
] as const;

export function SignUpForm() {
  const router = useRouter();
  const [tier, setTier] = useState<"solo" | "team" | "brokerage">("solo");
  const [fullName, setFullName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: "", color: "bg-gray-200" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-[#38B2D1]" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D] mb-2">
          Select Account Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={`rounded-xl border p-2.5 text-left transition-all ${tier === t.id
                ? "border-[#38B2D1] bg-[#38B2D1]/10 text-[#0B1F3D] ring-2 ring-[#38B2D1]/20"
                : "border-[#C4EBF2] bg-[#F0FAFC] text-[#557393] hover:border-[#38B2D1]/50"
                }`}
            >
              <div className="text-xs font-bold">{t.label}</div>
              <div className="mt-0.5 text-[10px] opacity-75">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Full Name
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <UserIcon className="h-4 w-4" />
          </span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Brokerage / Agency Name
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <BuildingIcon className="h-4 w-4" />
          </span>
          <input
            type="text"
            required
            value={brokerage}
            onChange={(e) => setBrokerage(e.target.value)}
            placeholder="e.g. Compass Premier Realty"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Work Email
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <MailIcon className="h-4 w-4" />
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@compassrealty.com"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Create Password
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <LockIcon className="h-4 w-4" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 pl-10 pr-11 text-sm font-medium text-[#0B1F3D] outline-none transition-all focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#557393] hover:text-[#0B1F3D]"
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>

        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#557393]">
              <span>Password strength:</span>
              <span className="font-bold text-[#0B1F3D]">{strength.label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2F5F8]">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start pt-1">
        <input
          id="terms"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#C4EBF2] text-[#38B2D1] focus:ring-[#38B2D1]"
        />
        <label htmlFor="terms" className="ml-2 text-xs text-[#557393]">
          I agree to HomeLink&apos;s{" "}
          <a href="#" className="font-semibold text-[#38B2D1] underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="font-semibold text-[#38B2D1] underline">
            Privacy Policy
          </a>
          .
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !termsAccepted}
        className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-6 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <span>Create Agent Workspace</span>
            <ArrowIcon className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="pt-1 text-center text-xs font-medium text-[#557393]">
        Already have a HomeLink account?{" "}
        <Link href="/sign-in" className="font-bold text-[#38B2D1] hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
}
