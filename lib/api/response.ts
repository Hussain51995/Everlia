import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiResponse } from "@/lib/types/auth";

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status: 200, ...init });
}

export function apiError(
  error: ApiErrorBody,
  status = 400,
  init?: ResponseInit
) {
  const body: ApiResponse<never> = { success: false, error };
  return NextResponse.json(body, { status, ...init });
}

export function validationError(message: string) {
  return apiError({ code: "VALIDATION_ERROR", message }, 400);
}

export function unauthorizedError(message = "Authentication required") {
  return apiError({ code: "UNAUTHORIZED", message }, 401);
}

export function mapAuthError(message: string | undefined): ApiErrorBody {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    };
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("email address has already been registered")
  ) {
    return {
      code: "USER_EXISTS",
      message: "An account with this email already exists",
    };
  }

  if (normalized.includes("email not confirmed")) {
    return {
      code: "EMAIL_NOT_CONFIRMED",
      message: "Please confirm your email before signing in",
    };
  }

  if (
    normalized.includes("organization_id is required") ||
    normalized.includes("organization_id must be a valid uuid") ||
    normalized.includes("selected organization is invalid")
  ) {
    return {
      code: "INVALID_ORGANIZATION",
      message: "Selected organization is invalid or inactive",
    };
  }

  if (normalized.includes("database error creating new user")) {
    return {
      code: "SIGNUP_TRIGGER_FAILED",
      message:
        "Account could not be created because organization signup checks failed. Confirm migrations 006–018 are applied, the selected organization is eligible, and try again.",
    };
  }

  if (
    normalized.includes("privileged membership roles") ||
    normalized.includes("assign_organization_owner")
  ) {
    return {
      code: "MEMBERSHIP_PRIVILEGE_BLOCKED",
      message:
        "Could not assign organization ownership. Apply migration 019 (assign_organization_owner) and retry.",
    };
  }

  if (normalized.includes("password")) {
    return {
      code: "WEAK_PASSWORD",
      message: message ?? "Password does not meet requirements",
    };
  }

  return {
    code: "AUTH_ERROR",
    message: message || "Something went wrong. Please try again.",
  };
}
