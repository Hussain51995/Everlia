import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PERSONAL_EMAIL_DOMAINS,
  isPersonalEmailDomain,
} from "@/lib/onboarding/personal-email-domains";

describe("isPersonalEmailDomain", () => {
  const original = process.env.PERSONAL_EMAIL_DOMAINS;
  const originalExtra = process.env.PERSONAL_EMAIL_DOMAINS_EXTRA;

  afterEach(() => {
    if (original === undefined) delete process.env.PERSONAL_EMAIL_DOMAINS;
    else process.env.PERSONAL_EMAIL_DOMAINS = original;
    if (originalExtra === undefined) {
      delete process.env.PERSONAL_EMAIL_DOMAINS_EXTRA;
    } else {
      process.env.PERSONAL_EMAIL_DOMAINS_EXTRA = originalExtra;
    }
  });

  it("flags common public providers", () => {
    expect(isPersonalEmailDomain("gmail.com")).toBe(true);
    expect(isPersonalEmailDomain("outlook.com")).toBe(true);
    expect(isPersonalEmailDomain("hotmail.com")).toBe(true);
    expect(isPersonalEmailDomain("icloud.com")).toBe(true);
    expect(isPersonalEmailDomain("yahoo.com")).toBe(true);
  });

  it("does not flag corporate domains", () => {
    expect(isPersonalEmailDomain("abcproperties.com")).toBe(false);
    expect(isPersonalEmailDomain("everlia.com")).toBe(false);
  });

  it("includes default list entries", () => {
    expect(DEFAULT_PERSONAL_EMAIL_DOMAINS).toContain("gmail.com");
  });

  it("supports PERSONAL_EMAIL_DOMAINS_EXTRA", () => {
    delete process.env.PERSONAL_EMAIL_DOMAINS;
    process.env.PERSONAL_EMAIL_DOMAINS_EXTRA = "corp-alias.test";
    expect(isPersonalEmailDomain("corp-alias.test")).toBe(true);
  });
});
