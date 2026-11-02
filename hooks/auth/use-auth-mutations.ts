"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import type { SessionPayload } from "@/lib/types/auth";
import type {
  ActiveOrganizationInput,
  ForgotPasswordInput,
  JoinOrganizationInput,
  ResendVerificationInput,
  SetupPasswordInput,
  SignInInput,
  SignUpInput,
  UpdatePasswordInput,
} from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/auth-store";
import { authKeys } from "@/hooks/auth/keys";
import { orgScopedKeys } from "@/hooks/cards/keys";

type SignInResponse = {
  session: SessionPayload;
};

type SignUpResponse = {
  user: { id: string; email: string | null } | null;
  session: SessionPayload | null;
  requiresEmailConfirmation: boolean;
  emailVerificationEnabled: boolean;
  verificationLink: string | null;
};

type JoinOrganizationResponse = {
  joined: boolean;
  alreadyMember: boolean;
  pending?: boolean;
  activation?: string;
  organization: { id: string; name: string; slug?: string };
  organizationName: string;
  session: SessionPayload | null;
};

export function useSignIn() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: SignInInput) =>
      apiClient<SignInResponse>("/api/auth/sign-in", {
        method: "POST",
        body: input,
      }),
    onSuccess: (data) => {
      setSession(data.session);
      queryClient.setQueryData(authKeys.session(), data.session);
      router.push("/dashboard");
      router.refresh();
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const resetSignupWizard = useAuthStore((state) => state.resetSignupWizard);

  return useMutation({
    mutationFn: (input: SignUpInput) =>
      apiClient<SignUpResponse>("/api/auth/sign-up", {
        method: "POST",
        body: input,
      }),
    onSuccess: (data) => {
      if (data.session) {
        setSession(data.session);
        queryClient.setQueryData(authKeys.session(), data.session);
        resetSignupWizard();
        router.push("/dashboard");
        router.refresh();
      }
    },
  });
}

export function useJoinOrganization() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const resetSignupWizard = useAuthStore((state) => state.resetSignupWizard);

  return useMutation({
    mutationFn: (input: JoinOrganizationInput) =>
      apiClient<JoinOrganizationResponse>("/api/auth/join-organization", {
        method: "POST",
        body: input,
      }),
    onSuccess: (data) => {
      if (data.session) {
        setSession(data.session);
        queryClient.setQueryData(authKeys.session(), data.session);
      }
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      orgScopedKeys.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: [...key] });
      });
      resetSignupWizard();
      router.refresh();
    },
  });
}

export function useSetActiveOrganization() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: ActiveOrganizationInput) =>
      apiClient<{ session: SessionPayload | null }>(
        "/api/auth/active-organization",
        {
          method: "POST",
          body: input,
        }
      ),
    onSuccess: async (data) => {
      if (data.session) {
        setSession(data.session);
        queryClient.setQueryData(authKeys.session(), data.session);
      }
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
      await Promise.all(
        orgScopedKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: [...key] })
        )
      );
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: () =>
      apiClient<{ signedOut: boolean }>("/api/auth/sign-out", {
        method: "POST",
      }),
    onSuccess: () => {
      clearSession();
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.clear();
      router.push("/sign-in");
      router.refresh();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiClient<{ sent: boolean; resetLink: string | null }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: input,
        }
      ),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (input: UpdatePasswordInput) =>
      apiClient<{ updated: boolean }>("/api/auth/update-password", {
        method: "POST",
        body: input,
      }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (input: ResendVerificationInput) =>
      apiClient<{ sent: boolean; verificationLink: string | null }>(
        "/api/auth/resend-verification",
        {
          method: "POST",
          body: input,
        }
      ),
  });
}

export function useSetupPassword() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: SetupPasswordInput) =>
      apiClient<{
        updated: boolean;
        session: SessionPayload | null;
        next: string;
      }>("/api/auth/setup-password", {
        method: "POST",
        body: input,
      }),
    onSuccess: (data) => {
      if (data.session) {
        setSession(data.session);
        queryClient.setQueryData(authKeys.session(), data.session);
      }
      router.push(data.next || "/dashboard");
      router.refresh();
    },
  });
}

export function useCheckEmail() {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      apiClient<{ email: string; nextStep: "continue" }>(
        "/api/auth/check-email",
        {
          method: "POST",
          body: input,
        }
      ),
  });
}
