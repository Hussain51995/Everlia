"use client";

import { useMemo, useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
  ArrowIcon,
} from "@/components/ui/Icons";
import type { SignupAccountMode, SignupIntent } from "@/stores/auth-store";
import {
  FormError,
  InfoBanner,
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  Spinner,
  textInputClass,
  textInputNoIconClass,
} from "@/components/auth/signup/shared";

export type AccountSetupValues = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  organizationName: string;
  termsAccepted: boolean;
};

type AccountSetupStepProps = {
  email: string;
  mode: SignupAccountMode;
  intent: SignupIntent;
  organizationLabel: string | null;
  values: AccountSetupValues;
  error: string | null;
  isSubmitting: boolean;
  onChange: (patch: Partial<AccountSetupValues>) => void;
  onModeChange: (mode: SignupAccountMode) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function AccountSetupStep({
  email,
  mode,
  intent,
  organizationLabel,
  values,
  error,
  isSubmitting,
  onChange,
  onModeChange,
  onSubmit,
  onBack,
}: AccountSetupStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = useMemo(() => {
    const password = values.password;
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
  }, [values.password]);

  const contextCopy =
    intent === "independent"
      ? "Creating your private independent workspace"
      : intent === "request_organization"
        ? "Requesting a new organization"
        : organizationLabel
          ? `Joining ${organizationLabel}`
          : "Setting up your account";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <FormError message={error} />
      <InfoBanner>{contextCopy}</InfoBanner>

      <div className="flex rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-1">
        <button
          type="button"
          onClick={() => onModeChange("new")}
          className={[
            "flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
            mode === "new"
              ? "bg-white text-[#0B1F3D] shadow-sm"
              : "text-[#557393]",
          ].join(" ")}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => onModeChange("existing")}
          className={[
            "flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
            mode === "existing"
              ? "bg-white text-[#0B1F3D] shadow-sm"
              : "text-[#557393]",
          ].join(" ")}
        >
          I have an account
        </button>
      </div>

      <div>
        <label className={fieldLabelClass}>Work Email</label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <MailIcon className="h-4 w-4" />
          </span>
          <input
            type="email"
            value={email}
            readOnly
            className={`${textInputClass} bg-[#E8F4F7]`}
          />
        </div>
      </div>

      {mode === "new" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="signup-first-name" className={fieldLabelClass}>
                First Name
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input
                  id="signup-first-name"
                  required
                  value={values.firstName}
                  onChange={(e) => onChange({ firstName: e.target.value })}
                  placeholder="John"
                  className={textInputClass}
                  autoComplete="given-name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-last-name" className={fieldLabelClass}>
                Last Name
              </label>
              <input
                id="signup-last-name"
                required
                value={values.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                placeholder="Doe"
                className={textInputNoIconClass}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-phone" className={fieldLabelClass}>
              Phone
            </label>
            <input
              id="signup-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="+1 555 123 4567"
              className={textInputNoIconClass}
              autoComplete="tel"
            />
          </div>

          {intent === "request_organization" ? (
            <div>
              <label htmlFor="signup-org-name" className={fieldLabelClass}>
                Organization name
              </label>
              <input
                id="signup-org-name"
                required
                value={values.organizationName}
                onChange={(e) => onChange({ organizationName: e.target.value })}
                placeholder="ABC Properties"
                className={textInputNoIconClass}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {mode === "existing" && intent === "request_organization" ? (
        <div>
          <label htmlFor="signup-org-name-existing" className={fieldLabelClass}>
            Organization name
          </label>
          <input
            id="signup-org-name-existing"
            required
            value={values.organizationName}
            onChange={(e) => onChange({ organizationName: e.target.value })}
            placeholder="ABC Properties"
            className={textInputNoIconClass}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="signup-password" className={fieldLabelClass}>
          {mode === "new" ? "Create Password" : "Password"}
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
            <LockIcon className="h-4 w-4" />
          </span>
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={values.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder={
              mode === "new" ? "Minimum 8 characters" : "Your account password"
            }
            className={`${textInputClass} pr-11`}
            autoComplete={mode === "new" ? "new-password" : "current-password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#557393] hover:text-[#0B1F3D]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        {mode === "new" && values.password ? (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E8F4F7]">
              <div
                className={`h-full ${passwordStrength.color} transition-all`}
                style={{ width: `${passwordStrength.score}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#557393]">
              {passwordStrength.label}
            </p>
          </div>
        ) : null}
      </div>

      {mode === "new" ? (
        <label className="flex items-start gap-2 text-xs text-[#557393]">
          <input
            type="checkbox"
            checked={values.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
            className="mt-0.5 rounded border-[#C4EBF2] text-[#38B2D1] focus:ring-[#38B2D1]"
          />
          <span>
            I agree to the Everlia terms of service and privacy policy.
          </span>
        </label>
      ) : (
        <InfoBanner tone="info">
          We&apos;ll sign you in and apply the selected organization path. No
          membership activates until your identity and join policy allow it.
        </InfoBanner>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          {isSubmitting ? (
            <Spinner />
          ) : (
            <>
              {mode === "new" ? "Create Account" : "Continue"}
              <ArrowIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
