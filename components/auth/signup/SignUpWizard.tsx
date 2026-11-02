"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import {
  useAcceptInvitation,
  useDiscoverOrganizations,
  useIndustries,
  useJoinOrganization,
  useProvisionIndependent,
  useRegisterIndependent,
  useRegisterOrganizationRequest,
  useRequestMembership,
  useResendVerification,
  useResolveInvitation,
  useSignUp,
  useSubmitOrganizationRequest,
} from "@/hooks/auth";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { SessionPayload } from "@/lib/types/auth";
import { emailSchema, passwordSchema, signUpSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { useToast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/hooks/auth/keys";
import { SignupProgress } from "@/components/auth/signup/SignupProgress";
import { IndustryStep } from "@/components/auth/signup/IndustryStep";
import { EmailStep } from "@/components/auth/signup/EmailStep";
import { DiscoveryStep } from "@/components/auth/signup/DiscoveryStep";
import {
  AccountSetupStep,
  type AccountSetupValues,
} from "@/components/auth/signup/AccountSetupStep";
import { EmailVerificationPending } from "@/components/auth/signup/EmailVerificationPending";

export function SignUpWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const industriesQuery = useIndustries();
  const setSession = useAuthStore((s) => s.setSession);

  const {
    signupStep,
    industryId,
    organizationId,
    signupEmail,
    discoveryResult,
    signupIntent,
    invitationToken,
    accountMode,
    selectedDiscoverableOrg,
    setSignupStep,
    setIndustryId,
    setSignupEmail,
    setDiscoveryResult,
    setSignupIntent,
    setInvitationToken,
    setAccountMode,
    setSelectedDiscoverableOrg,
    setOrganizationId,
    resetSignupWizard,
  } = useAuthStore();

  const discover = useDiscoverOrganizations();
  const signUp = useSignUp();
  const joinOrganization = useJoinOrganization();
  const registerIndependent = useRegisterIndependent();
  const registerOrgRequest = useRegisterOrganizationRequest();
  const requestMembership = useRequestMembership();
  const acceptInvitation = useAcceptInvitation();
  const resolveInvitation = useResolveInvitation();
  const provisionIndependent = useProvisionIndependent();
  const submitOrgRequest = useSubmitOrganizationRequest();
  const resendVerification = useResendVerification();

  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [accountValues, setAccountValues] = useState<AccountSetupValues>({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    organizationName: "",
    termsAccepted: true,
  });

  const isSubmitting =
    signUp.isPending ||
    joinOrganization.isPending ||
    registerIndependent.isPending ||
    registerOrgRequest.isPending ||
    requestMembership.isPending ||
    acceptInvitation.isPending ||
    resolveInvitation.isPending ||
    provisionIndependent.isPending ||
    submitOrgRequest.isPending;

  const selectedIndustry = industriesQuery.data?.find((i) => i.id === industryId);

  const organizationLabel =
    selectedDiscoverableOrg?.name ??
    (signupIntent === "independent"
      ? "Independent workspace"
      : signupIntent === "request_organization"
        ? accountValues.organizationName || "New organization"
        : null);

  const showVerificationPending = (payload: {
    emailVerificationEnabled: boolean;
    verificationLink: string | null;
  }) => {
    setEmailVerificationEnabled(payload.emailVerificationEnabled);
    setVerificationLink(payload.verificationLink);
    setAwaitingConfirmation(true);
  };

  const finishAuthenticated = (message: string, description?: string) => {
    showToast({
      tone: "success",
      title: message,
      description,
    });
    resetSignupWizard();
    router.push("/dashboard");
    router.refresh();
  };

  const signInExisting = async () => {
    const data = await apiClient<{ session: SessionPayload }>(
      "/api/auth/sign-in",
      {
        method: "POST",
        body: { email: signupEmail, password: accountValues.password },
      }
    );
    setSession(data.session);
    queryClient.setQueryData(authKeys.session(), data.session);
    return data.session;
  };

  const handleIndustryContinue = () => {
    setFormError(null);
    if (!industryId) {
      setFormError("Select a business type to continue");
      return;
    }
    setSignupStep(2);
  };

  const handleEmailContinue = () => {
    setFormError(null);
    if (!industryId) {
      setFormError("Select an industry first");
      setSignupStep(1);
      return;
    }

    const parsed = emailSchema.safeParse(signupEmail);
    if (!parsed.success) {
      setFormError(firstZodError(parsed.error, "Enter a valid email address"));
      return;
    }

    discover.mutate(
      { industryId, email: parsed.data },
      {
        onSuccess: (result) => {
          setSignupEmail(result.email ?? parsed.data);
          setDiscoveryResult(result);
          setSignupIntent(null);
          setInvitationToken("");
          setSelectedDiscoverableOrg(null);

          if (result.state === "single_match") {
            setSelectedDiscoverableOrg(result.organizations[0]);
            setSignupIntent("join");
          }

          if (result.state === "invalid_email") {
            setFormError(result.message);
            return;
          }

          setSignupStep(3);
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Unable to look up organizations. Please try again."
          );
        },
      }
    );
  };

  const handleDiscoveryContinue = () => {
    setFormError(null);
    if (!discoveryResult) {
      setFormError("Complete email discovery first");
      setSignupStep(2);
      return;
    }

    if (discoveryResult.state === "single_match") {
      setSelectedDiscoverableOrg(discoveryResult.organizations[0]);
      setSignupIntent("join");
      setAccountMode("new");
      setSignupStep(4);
      return;
    }

    if (discoveryResult.state === "multiple_matches") {
      if (invitationToken.trim()) {
        setSignupIntent("invitation");
        setAccountMode("new");
        setSignupStep(4);
        return;
      }
      if (!selectedDiscoverableOrg) {
        setFormError("Select an organization or enter an invitation token");
        return;
      }
      setSignupIntent("join");
      setAccountMode("new");
      setSignupStep(4);
      return;
    }

    if (
      discoveryResult.state === "no_match" ||
      discoveryResult.state === "personal_email"
    ) {
      if (!signupIntent) {
        setFormError("Choose how you want to continue");
        return;
      }
      if (signupIntent === "invitation" && !invitationToken.trim()) {
        setFormError("Enter your invitation token");
        return;
      }
      setAccountMode("new");
      setSignupStep(4);
    }
  };

  const handleNewAccountSubmit = () => {
    if (!industryId || !signupIntent) {
      setFormError("Missing signup selections");
      return;
    }
    if (!accountValues.termsAccepted) {
      setFormError("Please accept the terms to continue");
      return;
    }

    if (signupIntent === "join") {
      if (!organizationId) {
        setFormError("Select an organization to join");
        return;
      }
      const parsed = signUpSchema.safeParse({
        email: signupEmail,
        password: accountValues.password,
        firstName: accountValues.firstName,
        lastName: accountValues.lastName,
        phone: accountValues.phone,
        organizationId,
      });
      if (!parsed.success) {
        setFormError(firstZodError(parsed.error, "Invalid account details"));
        return;
      }

      signUp.mutate(parsed.data, {
        onSuccess: (data) => showVerificationPending(data),
        onError: (error) => {
          if (error instanceof ApiClientError && error.code === "USER_EXISTS") {
            setAccountMode("existing");
            setFormError(
              "An account with this email already exists. Enter your password to continue."
            );
            return;
          }
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Unable to create account"
          );
        },
      });
      return;
    }

    if (signupIntent === "independent") {
      const passwordParsed = passwordSchema.safeParse(accountValues.password);
      if (!passwordParsed.success) {
        setFormError(firstZodError(passwordParsed.error, "Invalid password"));
        return;
      }
      if (!accountValues.firstName.trim() || !accountValues.lastName.trim()) {
        setFormError("First and last name are required");
        return;
      }

      registerIndependent.mutate(
        {
          industryId,
          email: signupEmail,
          password: accountValues.password,
          firstName: accountValues.firstName,
          lastName: accountValues.lastName,
          phone: accountValues.phone || undefined,
        },
        {
          onSuccess: (data) => {
            showVerificationPending(data);
          },
          onError: (error) => {
            if (error instanceof ApiClientError && error.code === "USER_EXISTS") {
              setAccountMode("existing");
              setFormError(
                "An account with this email already exists. Sign in to continue as independent."
              );
              return;
            }
            setFormError(
              error instanceof ApiClientError
                ? error.message
                : "Unable to create independent workspace"
            );
          },
        }
      );
      return;
    }

    if (signupIntent === "request_organization") {
      if (accountValues.organizationName.trim().length < 2) {
        setFormError("Organization name is required");
        return;
      }
      registerOrgRequest.mutate(
        {
          industryId,
          email: signupEmail,
          password: accountValues.password,
          firstName: accountValues.firstName,
          lastName: accountValues.lastName,
          phone: accountValues.phone || undefined,
          organizationName: accountValues.organizationName,
          workspaceType: "company",
        },
        {
          onSuccess: (data) => {
            showToast({
              tone: "success",
              title: "Request submitted",
              description: `${data.organizationName} is pending review.`,
            });
            showVerificationPending(data);
          },
          onError: (error) => {
            if (error instanceof ApiClientError && error.code === "USER_EXISTS") {
              setAccountMode("existing");
              setFormError(
                "An account with this email already exists. Sign in to submit an organization request."
              );
              return;
            }
            setFormError(
              error instanceof ApiClientError
                ? error.message
                : "Unable to submit organization request"
            );
          },
        }
      );
      return;
    }

    if (signupIntent === "invitation") {
      resolveInvitation.mutate(
        { invitationToken: invitationToken.trim() },
        {
          onSuccess: (resolved) => {
            setOrganizationId(resolved.organizationId);
            const parsed = signUpSchema.safeParse({
              email: signupEmail,
              password: accountValues.password,
              firstName: accountValues.firstName,
              lastName: accountValues.lastName,
              phone: accountValues.phone,
              organizationId: resolved.organizationId,
            });
            if (!parsed.success) {
              setFormError(
                firstZodError(parsed.error, "Invalid account details")
              );
              return;
            }
            signUp.mutate(parsed.data, {
              onSuccess: (data) => showVerificationPending(data),
              onError: (error) => {
                setFormError(
                  error instanceof ApiClientError
                    ? error.message
                    : "Unable to create account"
                );
              },
            });
          },
          onError: (error) => {
            setFormError(
              error instanceof ApiClientError
                ? error.message
                : "Invitation is invalid or expired"
            );
          },
        }
      );
    }
  };

  const handleExistingAccountSubmit = async () => {
    if (!signupIntent || !industryId) {
      setFormError("Missing signup selections");
      return;
    }
    if (!accountValues.password) {
      setFormError("Enter your password");
      return;
    }

    try {
      if (signupIntent === "join") {
        if (!organizationId) {
          setFormError("Select an organization to join");
          return;
        }
        const data = await joinOrganization.mutateAsync({
          email: signupEmail,
          password: accountValues.password,
          organizationId,
          ...(invitationToken.trim()
            ? { invitationToken: invitationToken.trim() }
            : {}),
        });
        finishAuthenticated(
          data.pending
            ? "Membership pending"
            : data.alreadyMember
              ? "Already a member"
              : "Joined organization",
          data.organizationName
        );
        return;
      }

      await signInExisting();

      if (signupIntent === "independent") {
        const result = await provisionIndependent.mutateAsync({
          industryId,
        });
        finishAuthenticated("Workspace ready", result.organizationName);
        return;
      }

      if (signupIntent === "request_organization") {
        if (accountValues.organizationName.trim().length < 2) {
          setFormError("Organization name is required");
          return;
        }
        const result = await submitOrgRequest.mutateAsync({
          industryId,
          name: accountValues.organizationName,
          workspaceType: "company",
        });
        finishAuthenticated("Request submitted", result.requestedName);
        return;
      }

      if (signupIntent === "invitation") {
        const result = await acceptInvitation.mutateAsync({
          invitationToken: invitationToken.trim(),
        });
        finishAuthenticated("Invitation accepted", result.organizationName);
      }
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to continue with existing account"
      );
    }
  };

  const handleAccountSubmit = () => {
    setFormError(null);
    if (accountMode === "new") {
      handleNewAccountSubmit();
      return;
    }
    void handleExistingAccountSubmit();
  };

  if (awaitingConfirmation) {
    return (
      <EmailVerificationPending
        email={signupEmail}
        emailVerificationEnabled={emailVerificationEnabled}
        verificationLink={verificationLink}
        isResending={resendVerification.isPending}
        onResend={() => {
          resendVerification.mutate(
            { email: signupEmail },
            {
              onSuccess: (data) => {
                if (data.verificationLink) {
                  setVerificationLink(data.verificationLink);
                }
                showToast({
                  tone: "success",
                  title: "Verification email sent",
                  description: signupEmail,
                });
              },
              onError: (error) => {
                setFormError(
                  error instanceof ApiClientError
                    ? error.message
                    : "Unable to resend verification"
                );
              },
            }
          );
        }}
      />
    );
  }

  return (
    <div>
      <SignupProgress current={signupStep} />

      {selectedIndustry && signupStep > 1 ? (
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#557393]">
          {selectedIndustry.name}
          {signupEmail ? ` · ${signupEmail}` : ""}
        </p>
      ) : null}

      {signupStep === 1 ? (
        <IndustryStep
          industryId={industryId}
          error={formError}
          onSelect={(id) => {
            setFormError(null);
            setIndustryId(id);
          }}
          onContinue={handleIndustryContinue}
        />
      ) : null}

      {signupStep === 2 ? (
        <EmailStep
          email={signupEmail}
          error={formError}
          isLoading={discover.isPending}
          onEmailChange={(value) => {
            setSignupEmail(value);
            setFormError(null);
          }}
          onContinue={handleEmailContinue}
          onBack={() => {
            setFormError(null);
            setSignupStep(1);
          }}
        />
      ) : null}

      {signupStep === 3 && discoveryResult ? (
        <DiscoveryStep
          discovery={discoveryResult}
          selectedOrg={selectedDiscoverableOrg}
          invitationToken={invitationToken}
          intent={signupIntent}
          error={formError}
          onSelectOrg={(org) => {
            setFormError(null);
            setSelectedDiscoverableOrg(org);
            setSignupIntent("join");
          }}
          onInvitationTokenChange={(token) => {
            setInvitationToken(token);
            setFormError(null);
          }}
          onChooseIntent={(intent) => {
            setSignupIntent(intent);
            setFormError(null);
          }}
          onContinue={handleDiscoveryContinue}
          onBack={() => {
            setFormError(null);
            setSignupStep(2);
          }}
        />
      ) : null}

      {signupStep === 4 && signupIntent ? (
        <AccountSetupStep
          email={signupEmail}
          mode={accountMode}
          intent={signupIntent}
          organizationLabel={organizationLabel}
          values={accountValues}
          error={formError}
          isSubmitting={isSubmitting}
          onChange={(patch) =>
            setAccountValues((prev) => ({ ...prev, ...patch }))
          }
          onModeChange={(mode) => {
            setAccountMode(mode);
            setFormError(null);
            setAccountValues((prev) => ({ ...prev, password: "" }));
          }}
          onSubmit={handleAccountSubmit}
          onBack={() => {
            setFormError(null);
            setSignupStep(3);
          }}
        />
      ) : null}

      <p className="mt-6 text-center text-xs text-[#557393]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-bold text-[#38B2D1] hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
