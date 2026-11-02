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
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function EmailStep({
  email,
  error,
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

      <p className="text-center text-xs text-[#557393]">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-bold text-[#38B2D1] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
