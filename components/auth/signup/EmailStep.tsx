"use client";

import Link from "next/link";
import { MailIcon, ArrowIcon } from "@/components/ui/Icons";
import {
  FormError,
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  Spinner,
  textInputClass,
} from "@/components/auth/signup/shared";

type EmailStepProps = {
  email: string;
  error: string | null;
  existingAccount?: boolean;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function EmailStep({
  email,
  error,
  existingAccount = false,
  isLoading,
  onEmailChange,
  onContinue,
  onBack,
}: EmailStepProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onContinue();
      }}
    >
      <FormError message={error} />

      {existingAccount ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <p className="font-semibold">This email is already registered.</p>
          <p className="mt-1 text-xs text-amber-800/90">
            Sign in with your existing password instead of creating a new
            account.
          </p>
          <Link
            href="/sign-in"
            className="mt-2 inline-flex text-xs font-bold text-[#38B2D1] hover:underline"
          >
            Go to Sign in →
          </Link>
        </div>
      ) : null}

      <div>
        <label htmlFor="signup-work-email" className={fieldLabelClass}>
          Work Email
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <MailIcon className="h-4 w-4" />
          </span>
          <input
            id="signup-work-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="name@brokerage.com"
            className={textInputClass}
            aria-invalid={Boolean(error)}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[#557393]">
          We&apos;ll look for verified organizations matching your company
          domain.
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className={primaryButtonClass}
        >
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              Continue
              <ArrowIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
