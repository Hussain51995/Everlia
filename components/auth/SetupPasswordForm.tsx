"use client";

import { useState } from "react";
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowIcon,
  AlertCircleIcon,
} from "@/components/ui/Icons";
import { useSetupPassword } from "@/hooks/auth";
import { ApiClientError } from "@/lib/api/client";
import { setupPasswordSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export function SetupPasswordForm() {
  const setupPassword = useSetupPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = setupPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setFormError(firstZodError(parsed.error, "Invalid password"));
      return;
    }

    setupPassword.mutate(parsed.data, {
      onError: (error) => {
        setFormError(
          error instanceof ApiClientError
            ? error.message
            : "Unable to set password. Please try again."
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
          Create Password
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <LockIcon className="h-4 w-4" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
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

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Confirm Password
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <LockIcon className="h-4 w-4" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={setupPassword.isPending}
        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-6 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] hover:shadow-xl active:scale-[0.99] disabled:opacity-70"
      >
        {setupPassword.isPending ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <span>Continue to Dashboard</span>
            <ArrowIcon className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
