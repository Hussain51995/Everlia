"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
  BuildingIcon,
  ArrowIcon,
  CheckIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "@/components/ui/Icons";
import {
  useCheckEmail,
  useIndustries,
  useJoinOrganization,
  useOrganizations,
  useResendVerification,
  useSignUp,
} from "@/hooks/auth";
import { ApiClientError } from "@/lib/api/client";
import { emailSchema, signUpSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/Toast";

type AccountPath = "email" | "new" | "existing";

export function SignUpForm() {
  const router = useRouter();
  const signUp = useSignUp();
  const joinOrganization = useJoinOrganization();
  const checkEmail = useCheckEmail();
  const resendVerification = useResendVerification();
  const { showToast } = useToast();
  const {
    signupStep,
    industryId,
    organizationId,
    setSignupStep,
    setIndustryId,
    setOrganizationId,
  } = useAuthStore();

  const industriesQuery = useIndustries();
  const organizationsQuery = useOrganizations(industryId);

  const [accountPath, setAccountPath] = useState<AccountPath>("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  const isSubmitting =
    signUp.isPending || joinOrganization.isPending || checkEmail.isPending;

  const passwordStrength = useMemo(() => {
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
  }, [password]);

  const selectedIndustry = industriesQuery.data?.find((i) => i.id === industryId);
  const selectedOrganization = organizationsQuery.data?.find(
    (o) => o.id === organizationId
  );

  const resetAccountPath = () => {
    setAccountPath("email");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setTermsAccepted(true);
  };

  const goNextFromIndustry = () => {
    setFormError(null);
    if (!industryId) {
      setFormError("Select a business type to continue");
      return;
    }
    setSignupStep(2);
  };

  const goNextFromOrganization = () => {
    setFormError(null);
    if (!organizationId) {
      setFormError("Select an organization to continue");
      return;
    }
    resetAccountPath();
    setSignupStep(3);
  };

  const handleCheckEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFormError(firstZodError(parsed.error, "Enter a valid email address"));
      return;
    }

    checkEmail.mutate(
      { email: parsed.data },
      {
        onSuccess: (data) => {
          setEmail(data.email);
          setPassword("");
          setAccountPath(data.exists ? "existing" : "new");
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Unable to check email. Please try again."
          );
        },
      }
    );
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!organizationId) {
      setFormError("Select an organization to continue");
      return;
    }

    if (!password) {
      setFormError("Enter your password to join");
      return;
    }

    joinOrganization.mutate(
      { email, password, organizationId },
      {
        onSuccess: (data) => {
          showToast({
            tone: "success",
            title: data.alreadyMember
              ? `Already a member of ${data.organizationName}`
              : `You joined ${data.organizationName}`,
          });
          router.push("/dashboard");
          router.refresh();
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Unable to join organization. Please try again."
          );
        },
      }
    );
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!termsAccepted) {
      setFormError("Please accept the terms to continue");
      return;
    }

    if (!organizationId) {
      setFormError("Select an organization to continue");
      return;
    }

    const payload = {
      email,
      password,
      firstName,
      lastName,
      phone,
      organizationId,
    };

    const parsed = signUpSchema.safeParse(payload);

    if (!parsed.success) {
      setFormError(firstZodError(parsed.error, "Invalid signup data"));
      return;
    }

    signUp.mutate(parsed.data, {
      onSuccess: (data) => {
        if (data.requiresEmailConfirmation) {
          setAwaitingConfirmation(true);
          setEmailVerificationEnabled(data.emailVerificationEnabled);
          setVerificationLink(data.verificationLink);
          return;
        }
      },
      onError: (error) => {
        if (error instanceof ApiClientError && error.code === "USER_EXISTS") {
          setAccountPath("existing");
          setFormError(
            "An account with this email already exists. Enter your password to join."
          );
          return;
        }

        setFormError(
          error instanceof ApiClientError
            ? error.message
            : "Unable to create account. Please try again."
        );
      },
    });
  };

  const handleResend = () => {
    resendVerification.mutate(
      { email },
      {
        onSuccess: (data) => {
          if (data.verificationLink) {
            setVerificationLink(data.verificationLink);
            showToast({
              tone: "info",
              title: "Dev verification link ready",
              description: "Use the link below to verify your email.",
            });
            return;
          }

          showToast({
            tone: "success",
            title: "Verification email resent",
            description: `We sent another confirmation link to ${email}.`,
          });
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Could not resend",
            description:
              error instanceof ApiClientError
                ? error.message
                : "Please try again in a moment.",
          });
        },
      }
    );
  };

  if (awaitingConfirmation) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
          <CheckCircleIcon className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-[#0B1F3D]">
            Confirm your email
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#557393]">
            We created your account for{" "}
            <span className="font-bold text-[#0B1F3D]">{email}</span>.
            {emailVerificationEnabled
              ? " We emailed a confirmation link via Resend — check your inbox, then sign in."
              : " Email sending is disabled in this environment — use the verification link below."}
          </p>
        </div>

        {!emailVerificationEnabled && verificationLink ? (
          <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
              Dev verification link
            </p>
            <a
              href={verificationLink}
              className="mt-1 block break-all text-xs font-semibold text-[#38B2D1] hover:underline"
            >
              {verificationLink}
            </a>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendVerification.isPending}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2.5 text-xs font-bold text-[#0B1F3D] transition-all hover:bg-white disabled:opacity-70"
          >
            <RefreshCwIcon className="h-3.5 w-3.5 text-[#38B2D1]" />
            {resendVerification.isPending
              ? "Sending…"
              : emailVerificationEnabled
                ? "Resend verification email"
                : "Regenerate verification link"}
          </button>
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#2ca0be]"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${
                signupStep === step
                  ? "bg-[#38B2D1] text-white"
                  : signupStep > step
                    ? "bg-emerald-500 text-white"
                    : "bg-[#F0FAFC] text-[#557393]"
              }`}
            >
              {signupStep > step ? <CheckIcon className="h-3.5 w-3.5" /> : step}
            </div>
            {step < 3 ? (
              <div
                className={`h-0.5 flex-1 rounded-full ${
                  signupStep > step ? "bg-emerald-400" : "bg-[#C4EBF2]"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#557393]">
        {signupStep === 1 && "Step 1 · Choose business type"}
        {signupStep === 2 && "Step 2 · Choose organization"}
        {signupStep === 3 &&
          (accountPath === "existing"
            ? "Step 3 · Join with your account"
            : accountPath === "new"
              ? "Step 3 · Create your account"
              : "Step 3 · Enter your email")}
      </div>

      {formError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      {signupStep === 1 ? (
        <div className="space-y-4">
          {industriesQuery.isLoading ? (
            <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-8 text-center text-xs text-[#557393]">
              Loading business types…
            </div>
          ) : industriesQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              Could not load industries. Check your Supabase setup.
            </div>
          ) : (
            <div className="space-y-2">
              {(industriesQuery.data ?? []).map((industry) => (
                <button
                  key={industry.id}
                  type="button"
                  onClick={() => setIndustryId(industry.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                    industryId === industry.id
                      ? "border-[#38B2D1] bg-[#38B2D1]/10 ring-2 ring-[#38B2D1]/20"
                      : "border-[#C4EBF2] bg-[#F0FAFC] hover:border-[#38B2D1]/50"
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-[#0B1F3D]">
                      {industry.name}
                    </div>
                    <div className="text-[11px] text-[#557393]">
                      {industry.slug}
                    </div>
                  </div>
                  {industryId === industry.id ? (
                    <CheckIcon className="h-4 w-4 text-[#38B2D1]" />
                  ) : null}
                </button>
              ))}
              {(industriesQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-[#557393]">
                  No active industries found. Ask a platform admin to create one.
                </p>
              ) : null}
            </div>
          )}

          <button
            type="button"
            onClick={goNextFromIndustry}
            className="inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-6 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be]"
          >
            Continue
            <ArrowIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {signupStep === 2 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-xs text-[#557393]">
            Industry:{" "}
            <span className="font-bold text-[#0B1F3D]">
              {selectedIndustry?.name ?? "—"}
            </span>
          </div>

          {organizationsQuery.isLoading ? (
            <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-8 text-center text-xs text-[#557393]">
              Loading organizations…
            </div>
          ) : organizationsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              Could not load organizations.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
                Organization
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
                  <BuildingIcon className="h-4 w-4" />
                </span>
                <select
                  value={organizationId ?? ""}
                  onChange={(e) => setOrganizationId(e.target.value || null)}
                  className="w-full appearance-none rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
                >
                  <option value="">Select an organization</option>
                  {(organizationsQuery.data ?? []).map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              {(organizationsQuery.data ?? []).length === 0 ? (
                <p className="mt-2 text-xs text-[#557393]">
                  No active organizations for this industry yet. Ask a platform
                  admin to create one.
                </p>
              ) : null}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setSignupStep(1);
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl border border-[#C4EBF2] bg-white px-4 text-sm font-bold text-[#0B1F3D] transition-all hover:bg-[#F0FAFC]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNextFromOrganization}
              className="inline-flex min-h-[46px] flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-4 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be]"
            >
              Continue
              <ArrowIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {signupStep === 3 && accountPath === "email" ? (
        <form onSubmit={handleCheckEmail} className="space-y-4">
          <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-xs text-[#557393]">
            Joining{" "}
            <span className="font-bold text-[#0B1F3D]">
              {selectedOrganization?.name ?? "organization"}
            </span>
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
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@brokerage.com"
                className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#557393]">
              We&apos;ll check whether you already have a HomeLink account.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setSignupStep(2);
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl border border-[#C4EBF2] bg-white px-4 text-sm font-bold text-[#0B1F3D] transition-all hover:bg-[#F0FAFC]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[46px] flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-4 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] disabled:opacity-70"
            >
              {checkEmail.isPending ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Continue
                  <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : null}

      {signupStep === 3 && accountPath === "existing" ? (
        <form onSubmit={handleJoinExisting} className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Welcome back — enter your password to join{" "}
            <span className="font-bold">
              {selectedOrganization?.name ?? "this organization"}
            </span>
            .
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
                value={email}
                readOnly
                className="w-full rounded-2xl border border-[#C4EBF2] bg-[#E8F4F7] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setAccountPath("email");
                setPassword("");
              }}
              className="mt-1.5 text-[11px] font-bold text-[#38B2D1] hover:underline"
            >
              Use a different email
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Password
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
                <LockIcon className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your account password"
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setAccountPath("email");
                setPassword("");
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl border border-[#C4EBF2] bg-white px-4 text-sm font-bold text-[#0B1F3D] transition-all hover:bg-[#F0FAFC]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[46px] flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-4 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] disabled:opacity-70"
            >
              {joinOrganization.isPending ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Join organization
                  <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : null}

      {signupStep === 3 && accountPath === "new" ? (
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-xs text-[#557393]">
            Creating a new account to join{" "}
            <span className="font-bold text-[#0B1F3D]">
              {selectedOrganization?.name ?? "organization"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
                First Name
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-3 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
                Last Name
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 px-3 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 px-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
            />
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
                value={email}
                readOnly
                className="w-full rounded-2xl border border-[#C4EBF2] bg-[#E8F4F7] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setAccountPath("email");
                setPassword("");
              }}
              className="mt-1.5 text-[11px] font-bold text-[#38B2D1] hover:underline"
            >
              Use a different email
            </button>
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
            {password ? (
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[#557393]">
                  <span>Strength</span>
                  <span>{passwordStrength.label}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#C4EBF2]">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-xs text-[#557393]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#C4EBF2] text-[#38B2D1] focus:ring-[#38B2D1]"
            />
            <span>
              I agree to the HomeLink terms of service and privacy policy.
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setAccountPath("email");
                setPassword("");
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl border border-[#C4EBF2] bg-white px-4 text-sm font-bold text-[#0B1F3D] transition-all hover:bg-[#F0FAFC]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[46px] flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-4 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] disabled:opacity-70"
            >
              {signUp.isPending ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Create Account
                  <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : null}

      <div className="pt-1 text-center text-xs font-medium text-[#557393]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-bold text-[#38B2D1] hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
