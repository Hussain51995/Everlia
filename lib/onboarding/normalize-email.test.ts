import { describe, expect, it } from "vitest";
import {
  extractEmailDomain,
  normalizeEmailAddress,
  normalizeEmailAndDomain,
} from "@/lib/onboarding/normalize-email";

describe("normalizeEmailAddress", () => {
  it("normalizes case and trims", () => {
    expect(normalizeEmailAddress("  John@ABCProperties.COM ")).toBe(
      "john@abcproperties.com"
    );
  });

  it("rejects invalid emails", () => {
    expect(normalizeEmailAddress("")).toBeNull();
    expect(normalizeEmailAddress("not-an-email")).toBeNull();
    expect(normalizeEmailAddress("@missing-local.com")).toBeNull();
    expect(normalizeEmailAddress("missing-domain@")).toBeNull();
  });
});

describe("extractEmailDomain", () => {
  it("extracts domain from email", () => {
    expect(extractEmailDomain("john@abcproperties.com")).toBe(
      "abcproperties.com"
    );
  });

  it("accepts bare domains", () => {
    expect(extractEmailDomain("ABCProperties.com")).toBe("abcproperties.com");
  });

  it("rejects personal-looking invalid hosts", () => {
    expect(extractEmailDomain("localhost")).toBeNull();
    expect(extractEmailDomain("")).toBeNull();
  });
});

describe("normalizeEmailAndDomain", () => {
  it("returns both email and domain", () => {
    expect(normalizeEmailAndDomain("jane@Broker.Example")).toEqual({
      email: "jane@broker.example",
      domain: "broker.example",
    });
  });
});
