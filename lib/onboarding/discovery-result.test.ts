import { describe, expect, it } from "vitest";
import {
  buildDiscoveryResult,
  sortDiscoverableOrganizations,
} from "@/lib/onboarding/discovery-result";
import type { DiscoverableOrganizationSummary } from "@/lib/types/onboarding";

const org = (
  partial: Partial<DiscoverableOrganizationSummary> &
    Pick<DiscoverableOrganizationSummary, "id" | "name">
): DiscoverableOrganizationSummary => ({
  slug: partial.slug ?? partial.name.toLowerCase().replace(/\s+/g, "-"),
  industryId: partial.industryId ?? "11111111-1111-1111-1111-111111111111",
  workspaceType: partial.workspaceType ?? "company",
  joinPolicy: partial.joinPolicy ?? "verified_domain",
  matchedDomain: partial.matchedDomain ?? "abcproperties.com",
  ...partial,
});

describe("buildDiscoveryResult", () => {
  it("returns invalid_email", () => {
    expect(
      buildDiscoveryResult({
        email: null,
        domain: null,
        isPersonal: false,
        matches: [],
      }).state
    ).toBe("invalid_email");
  });

  it("returns personal_email with independent + invitation paths", () => {
    const result = buildDiscoveryResult({
      email: "a@gmail.com",
      domain: "gmail.com",
      isPersonal: true,
      matches: [],
    });
    expect(result.state).toBe("personal_email");
    if (result.state === "personal_email") {
      expect(result.paths.canContinueIndependent).toBe(true);
      expect(result.paths.canUseInvitation).toBe(true);
    }
  });

  it("returns no_match with create + independent paths", () => {
    const result = buildDiscoveryResult({
      email: "a@newco.com",
      domain: "newco.com",
      isPersonal: false,
      matches: [],
    });
    expect(result.state).toBe("no_match");
    if (result.state === "no_match") {
      expect(result.paths.canRequestOrganization).toBe(true);
      expect(result.paths.canContinueIndependent).toBe(true);
    }
  });

  it("returns single_match with preselection and join policy", () => {
    const match = org({
      id: "22222222-2222-2222-2222-222222222222",
      name: "ABC Properties",
      joinPolicy: "approval_required",
    });
    const result = buildDiscoveryResult({
      email: "john@abcproperties.com",
      domain: "abcproperties.com",
      isPersonal: false,
      matches: [match],
    });
    expect(result.state).toBe("single_match");
    if (result.state === "single_match") {
      expect(result.preselectedOrganizationId).toBe(match.id);
      expect(result.joinPolicy).toBe("approval_required");
      expect(result.requiresVerifiedIdentity).toBe(true);
      expect(result.organizations).toHaveLength(1);
    }
  });

  it("returns multiple_matches without auto-selecting", () => {
    const matches = [
      org({ id: "a", name: "Team A" }),
      org({ id: "b", name: "Team B" }),
    ];
    const result = buildDiscoveryResult({
      email: "john@abcproperties.com",
      domain: "abcproperties.com",
      isPersonal: false,
      matches,
    });
    expect(result.state).toBe("multiple_matches");
    if (result.state === "multiple_matches") {
      expect(result.requiresSelection).toBe(true);
      expect(result.requiresInvitationForDisambiguation).toBe(true);
      expect("preselectedOrganizationId" in result).toBe(false);
      expect(result.organizations).toHaveLength(2);
    }
  });
});

describe("sortDiscoverableOrganizations", () => {
  it("sorts by name then id and does not prefer first insertion", () => {
    const sorted = sortDiscoverableOrganizations([
      org({ id: "2", name: "Zulu" }),
      org({ id: "1", name: "Alpha" }),
    ]);
    expect(sorted.map((o) => o.name)).toEqual(["Alpha", "Zulu"]);
  });
});
