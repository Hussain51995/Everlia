import { cookies } from "next/headers";

export const ACTIVE_ORG_COOKIE = "hl_active_org";

export function getActiveOrganizationIdFromCookie(): string | null {
  const value = cookies().get(ACTIVE_ORG_COOKIE)?.value?.trim();
  return value || null;
}

export function setActiveOrganizationCookie(organizationId: string) {
  cookies().set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clearActiveOrganizationCookie() {
  cookies().set(ACTIVE_ORG_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
