"use client";

import Link from "next/link";
import { CheckCircleIcon, RefreshCwIcon } from "@/components/ui/Icons";
import {
  InfoBanner,
  primaryButtonClass,
  Spinner,
} from "@/components/auth/signup/shared";

type EmailVerificationPendingProps = {
  email: string;
  emailVerificationEnabled: boolean;
  verificationLink: string | null;
  isResending: boolean;
  onResend: () => void;
};

export function EmailVerificationPending({
  email,
  emailVerificationEnabled,
  verificationLink,
  isResending,
  onResend,
}: EmailVerificationPendingProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
        <CheckCircleIcon className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-[#0B1F3D]">
          Confirm your email
        </h2>
        <p className="mt-1 text-sm text-[#557393]">
          We sent a verification link to{" "}
          <span className="font-semibold text-[#0B1F3D]">{email}</span>. Your
          organization membership stays pending until your email is verified.
        </p>
      </div>

      {!emailVerificationEnabled && verificationLink ? (
        <InfoBanner tone="info">
          <span className="block font-bold text-[#0B1F3D]">Dev verification link</span>
          <a
            href={verificationLink}
            className="mt-1 block break-all font-medium text-[#38B2D1] underline"
          >
            {verificationLink}
          </a>
        </InfoBanner>
      ) : null}

      <button
        type="button"
        onClick={onResend}
        disabled={isResending}
        className={`w-full ${primaryButtonClass}`}
      >
        {isResending ? (
          <Spinner />
        ) : (
          <>
            <RefreshCwIcon className="h-4 w-4" />
            Resend verification email
          </>
        )}
      </button>

      <Link
        href="/sign-in"
        className="inline-flex text-sm font-bold text-[#38B2D1] hover:underline"
      >
        Go to Sign In
      </Link>
    </div>
  );
}
