import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { buildDiscoveryResult } from "@/lib/onboarding/discovery-result";
import { resolveJoinMembershipIntent } from "@/lib/onboarding/join-policy";
import { isPersonalEmailDomain } from "@/lib/onboarding/personal-email-domains";
import { normalizeEmailAndDomain } from "@/lib/onboarding/normalize-email";
import {
  excludeLegacyOtherOrganizations,
  isLegacyOtherOrganization,
} from "@/lib/auth/sort-organizations";
import { hashDomainChallengeToken } from "@/lib/onboarding/domain-challenge";
import type { DiscoverableOrganizationSummary } from "@/lib/types/onboarding";

const org = (
  partial: Partial<DiscoverableOrganizationSummary> &
    Pick<DiscoverableOrganizationSummary, "id" | "name">
): DiscoverableOrganizationSummary => ({
  slug: partial.slug ?? "slug",
  industryId: partial.industryId ?? "11111111-1111-1111-1111-111111111111",
  workspaceType: partial.workspaceType ?? "company",
  joinPolicy: partial.joinPolicy ?? "verified_domain",
  matchedDomain: partial.matchedDomain ?? "acme.com",
  ...partial,
});

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Phase 7 TC-01 single verified-domain match", () => {
  it("UNIT_PASS: preselects the single matched organization", () => {
    const match = org({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Acme Realty",
      joinPolicy: "verified_domain",
      matchedDomain: "acme.com",
    });
    const result = buildDiscoveryResult({
      email: "jane@acme.com",
      domain: "acme.com",
      isPersonal: false,
      matches: [match],
    });
    expect(result.state).toBe("single_match");
    if (result.state === "single_match") {
      expect(result.preselectedOrganizationId).toBe(match.id);
      expect(result.organizations[0]?.matchedDomain).toBe("acme.com");
    }
  });
});

describe("Phase 7 TC-02 no matching organization", () => {
  it("UNIT_PASS: offers organization request + independent paths", () => {
    const result = buildDiscoveryResult({
      email: "a@brand-new.co",
      domain: "brand-new.co",
      isPersonal: false,
      matches: [],
    });
    expect(result.state).toBe("no_match");
    if (result.state === "no_match") {
      expect(result.paths.canRequestOrganization).toBe(true);
      expect(result.paths.canContinueIndependent).toBe(true);
    }
  });
});

describe("Phase 7 TC-03 personal email providers", () => {
  it("UNIT_PASS: gmail/outlook are personal — no company auto-match", () => {
    expect(isPersonalEmailDomain("gmail.com")).toBe(true);
    expect(isPersonalEmailDomain("outlook.com")).toBe(true);
    const result = buildDiscoveryResult({
      email: "me@gmail.com",
      domain: "gmail.com",
      isPersonal: true,
      matches: [],
    });
    expect(result.state).toBe("personal_email");
    if (result.state === "personal_email") {
      expect(result.organizations).toHaveLength(0);
      expect(result.paths.canContinueIndependent).toBe(true);
      expect(result.paths.canUseInvitation).toBe(true);
    }
  });
});

describe("Phase 7 TC-04 multiple organization matches", () => {
  it("UNIT_PASS: requires selection / invitation; no auto-pick", () => {
    const result = buildDiscoveryResult({
      email: "x@shared.com",
      domain: "shared.com",
      isPersonal: false,
      matches: [
        org({ id: "1", name: "Org One", matchedDomain: "shared.com" }),
        org({ id: "2", name: "Org Two", matchedDomain: "shared.com" }),
      ],
    });
    expect(result.state).toBe("multiple_matches");
    if (result.state === "multiple_matches") {
      expect(result.requiresSelection).toBe(true);
      expect(result.requiresInvitationForDisambiguation).toBe(true);
      expect("preselectedOrganizationId" in result).toBe(false);
    }
  });
});

describe("Phase 7 TC-05 / TC-06 path contracts (static)", () => {
  it("CODE_REVIEW_PASS: independent path exports owner + independent workspace", () => {
    const src = readRepo("lib/onboarding/independent.ts");
    expect(src).toContain("provision_independent_workspace");
    expect(src).toContain('workspaceType: "independent"');
    expect(src).toContain('role: "owner"');
    expect(src).toMatch(/Never places the user into a shared/);
  });

  it("CODE_REVIEW_PASS: company draft starts pending/inactive + DNS challenge", () => {
    const src = readRepo("lib/onboarding/organization-lifecycle.ts");
    expect(src).toContain('onboarding_status: "pending"');
    expect(src).toContain("is_active: false");
    expect(src).toContain("ensureDomainVerificationChallenge");
    expect(src).toContain("existingRequest?.resulting_organization_id");
  });
});

describe("Phase 7 TC-07 / TC-08 / TC-09 join policies", () => {
  it("UNIT_PASS TC-08: approval_required → pending membership", () => {
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
    }
  });

  it("UNIT_PASS TC-09: invite_only without invitation → denied", () => {
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

  it("CODE_REVIEW_PASS TC-07: join upserts member role only (no self-elevation)", () => {
    const src = readRepo("lib/onboarding/membership.ts");
    expect(src).toContain('role: "member"');
    expect(src).not.toMatch(/role:\s*"owner"/);
    expect(src).toContain("requestOrganizationMembership");
  });
});

describe("Phase 7 TC-10 industry create does not spawn Other", () => {
  it("CODE_REVIEW_PASS: createIndustry has no Other insert", () => {
    const src = readRepo("lib/auth/organizations.ts");
    expect(src).toContain("export async function createIndustry");
    expect(src).not.toMatch(
      /createOrganization\(\{[\s\S]*name:\s*"Other"[\s\S]*slug:\s*"other"/
    );
    expect(isLegacyOtherOrganization({ name: "Other", slug: "other" })).toBe(
      true
    );
    expect(
      excludeLegacyOtherOrganizations([
        { name: "Other", slug: "other" },
        { name: "Acme", slug: "acme" },
      ])
    ).toHaveLength(1);
  });

  it("CODE_REVIEW_PASS: migration 017 blocks active Other recreation", () => {
    const sql = readRepo(
      "supabase/migrations/017_retire_legacy_other_organizations.sql"
    );
    expect(sql).toContain("prevent_new_system_other_org");
    expect(sql).toContain("is_system_other");
    expect(sql).toMatch(/NON-DESTRUCTIVE|Does NOT delete/i);
    expect(sql).not.toMatch(/delete from public\.organizations/i);
  });
});

describe("Phase 7 TC-11–TC-15 security contracts", () => {
  it("CODE_REVIEW_PASS TC-11/14: is_organization_member requires status=active", () => {
    const sql = readRepo(
      "supabase/migrations/009_membership_roles_and_rbac.sql"
    );
    expect(sql).toContain("create or replace function public.is_organization_member");
    expect(sql).toMatch(/om\.status = 'active'/);
    const crm = readRepo("supabase/migrations/004_greeting_cards.sql");
    expect(crm).toContain("Members can view org customers");
    expect(crm).toContain("public.is_organization_member(organization_id)");
  });

  it("CODE_REVIEW_PASS TC-12: privilege escalation trigger blocks owner/admin self-assign", () => {
    const sql = readRepo(
      "supabase/migrations/009_membership_roles_and_rbac.sql"
    );
    expect(sql).toContain("enforce_membership_role_security");
    expect(sql).toContain(
      "Privileged membership roles require a trusted backend operation"
    );
    expect(sql).toContain("Cannot self-activate organization membership");
  });

  it("CODE_REVIEW_PASS TC-13: discovery SQL filters verification_status=verified only", () => {
    const sql = readRepo(
      "supabase/migrations/010_organization_requests_and_provisioning.sql"
    );
    expect(sql).toContain("discover_organizations_by_verified_domain");
    expect(sql).toContain("od.verification_status = 'verified'");
    const discover = readRepo("lib/onboarding/discover.ts");
    expect(discover).toContain('.eq("verification_status", "verified")');
  });

  it("CODE_REVIEW_PASS TC-14: pending members may read org metadata only", () => {
    const sql = readRepo(
      "supabase/migrations/011_hybrid_rls_pending_membership_visibility.sql"
    );
    expect(sql).toContain("has_organization_membership_record");
    expect(sql).toMatch(/CRM tables continue to require active membership/);
  });

  it("CODE_REVIEW_PASS TC-15: company create reuses pending request (idempotent)", () => {
    const src = readRepo("lib/onboarding/organization-lifecycle.ts");
    expect(src).toContain("Idempotent: reuse open pending request");
    expect(src).toContain('.eq("status", "pending")');
    expect(src).toContain("failOnDuplicate");
  });

  it("UNIT_PASS: DNS challenge tokens hash distinctly from plaintext", () => {
    const token = "phase7-token-example";
    expect(hashDomainChallengeToken(token)).not.toBe(token);
    expect(hashDomainChallengeToken(token)).toHaveLength(64);
  });
});

describe("Phase 7 migration chain integrity", () => {
  it("CODE_REVIEW_PASS: hybrid migrations 006–017 are present", () => {
    const names = readdirSync(resolve(process.cwd(), "supabase/migrations"));
    for (const n of [
      "006",
      "007",
      "008",
      "009",
      "010",
      "011",
      "012",
      "013",
      "014",
      "015",
      "016",
      "017",
    ]) {
      expect(names.some((f) => f.startsWith(`${n}_`))).toBe(true);
    }
  });

  it("UNIT_PASS: email normalization supports discovery inputs", () => {
    expect(normalizeEmailAndDomain(" Jane.Doe@Acme.COM ")).toEqual({
      email: "jane.doe@acme.com",
      domain: "acme.com",
    });
  });
});
