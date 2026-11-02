import { describe, expect, it } from "vitest";
import { resolveJoinMembershipIntent } from "@/lib/onboarding/join-policy";

describe("Path A — resolveJoinMembershipIntent", () => {
  it("blocks invite_only without invitation", () => {
    const intent = resolveJoinMembershipIntent({
      policy: "invite_only",
      hasInvitation: false,
      hasEmailDomain: true,
      domainVerifiedForOrg: true,
      organizationName: "Acme",
    });
    expect(intent.kind).toBe("blocked");
    if (intent.kind === "blocked") {
      expect(intent.activation).toBe("invitation_required");
    }
  });

  it("allows invite_only with invitation → active after email verify", () => {
    const intent = resolveJoinMembershipIntent({
      policy: "invite_only",
      hasInvitation: true,
      hasEmailDomain: false,
      domainVerifiedForOrg: false,
      organizationName: "Acme",
    });
    expect(intent.kind).toBe("upsert");
    if (intent.kind === "upsert") {
      expect(intent.targetStatus).toBe("active");
      expect(intent.requiresVerifiedEmailForActive).toBe(true);
    }
  });

  it("requires verified domain + email domain for verified_domain joins", () => {
    const missingDomain = resolveJoinMembershipIntent({
      policy: "verified_domain",
      hasInvitation: false,
      hasEmailDomain: false,
      domainVerifiedForOrg: false,
      organizationName: "Acme",
    });
    expect(missingDomain.kind).toBe("blocked");
    if (missingDomain.kind === "blocked") {
      expect(missingDomain.activation).toBe("domain_mismatch");
    }

    const unverifiedOrgDomain = resolveJoinMembershipIntent({
      policy: "verified_domain",
      hasInvitation: false,
      hasEmailDomain: true,
      domainVerifiedForOrg: false,
      organizationName: "Acme",
    });
    expect(unverifiedOrgDomain.kind).toBe("blocked");

    const ok = resolveJoinMembershipIntent({
      policy: "verified_domain",
      hasInvitation: false,
      hasEmailDomain: true,
      domainVerifiedForOrg: true,
      organizationName: "Acme",
    });
    expect(ok.kind).toBe("upsert");
    if (ok.kind === "upsert") {
      expect(ok.targetStatus).toBe("active");
      expect(ok.requiresVerifiedEmailForActive).toBe(true);
    }
  });

  it("creates pending membership for approval_required without invitation", () => {
    const intent = resolveJoinMembershipIntent({
      policy: "approval_required",
      hasInvitation: false,
      hasEmailDomain: true,
      domainVerifiedForOrg: true,
      organizationName: "Acme",
    });
    expect(intent.kind).toBe("upsert");
    if (intent.kind === "upsert") {
      expect(intent.targetStatus).toBe("pending");
      expect(intent.requiresVerifiedEmailForActive).toBe(false);
      expect(intent.pendingMessage).toContain("admin must approve");
    }
  });

  it("elevates approval_required to active when invitation present", () => {
    const intent = resolveJoinMembershipIntent({
      policy: "approval_required",
      hasInvitation: true,
      hasEmailDomain: true,
      domainVerifiedForOrg: false,
      organizationName: "Acme",
    });
    expect(intent.kind).toBe("upsert");
    if (intent.kind === "upsert") {
      expect(intent.targetStatus).toBe("active");
    }
  });
});
