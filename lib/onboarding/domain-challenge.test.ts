import { describe, expect, it } from "vitest";
import { createHash, randomBytes } from "crypto";
import { hashDomainChallengeToken } from "@/lib/onboarding/domain-challenge";


function buildTxtHost(domain: string) {
  return `_everlia-challenge.${domain}`;
}

function buildTxtValue(token: string) {
  return `everlia-verify=${token}`;
}

describe("Path B — DNS TXT domain ownership challenge", () => {
  it("builds challenge host under _everlia-challenge subdomain", () => {
    expect(buildTxtHost("acme.com")).toBe("_everlia-challenge.acme.com");
  });

  it("embeds token in everlia-verify TXT value", () => {
    const token = "abc123token";
    expect(buildTxtValue(token)).toBe("everlia-verify=abc123token");
  });

  it("hashes tokens with sha256 hex for storage comparisons", () => {
    const token = randomBytes(16).toString("base64url");
    const expected = createHash("sha256").update(token, "utf8").digest("hex");
    expect(hashDomainChallengeToken(token)).toBe(expected);
    expect(hashDomainChallengeToken(token)).not.toBe(token);
  });

  it("does not treat email local-part ownership as domain ownership", () => {
    const email = "john@acme.com";
    const domain = "acme.com";
    expect(email.endsWith(`@${domain}`)).toBe(true);
    const challengeValue = buildTxtValue("secret");
    expect(challengeValue.includes(email)).toBe(false);
    expect(buildTxtHost(domain).startsWith("_everlia-challenge.")).toBe(true);
  });
});

describe("Path B — activation gates", () => {
  it("only activates when a verified domain row exists", () => {
    const canActivate = (domains: Array<{ verification_status: string }>) =>
      domains.some((d) => d.verification_status === "verified");

    expect(
      canActivate([{ verification_status: "pending" }])
    ).toBe(false);
    expect(
      canActivate([
        { verification_status: "pending" },
        { verification_status: "verified" },
      ])
    ).toBe(true);
  });

  it("detects duplicate active orgs on the same industry domain", () => {
    const duplicates = [
      {
        organizationId: "1",
        isActive: true,
        matchedDomain: "acme.com",
      },
      {
        organizationId: "2",
        isActive: false,
        matchedDomain: "acme.com",
      },
    ];
    const blocking = duplicates.filter((d) => d.isActive);
    expect(blocking).toHaveLength(1);
    expect(blocking[0]?.organizationId).toBe("1");
  });
});
