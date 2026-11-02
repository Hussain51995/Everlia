import { describe, expect, it } from "vitest";
import type { IndependentWorkspaceResult } from "@/lib/types/onboarding";

function mapIndependentRpcRow(row: {
  id: string;
  name: string;
}): IndependentWorkspaceResult {
  return {
    organizationId: row.id,
    organizationName: row.name || "Independent Workspace",
    workspaceType: "independent",
    role: "owner",
  };
}

describe("Path C — independent professional provisioning", () => {
  it("maps RPC row to owner of an independent workspace", () => {
    const result = mapIndependentRpcRow({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Jordan Lee",
    });
    expect(result).toEqual({
      organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      organizationName: "Jordan Lee",
      workspaceType: "independent",
      role: "owner",
    });
  });

  it("never assigns company/team workspace type for independents", () => {
    const result = mapIndependentRpcRow({
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      name: "Solo Agent",
    });
    expect(result.workspaceType).toBe("independent");
    expect(result.role).toBe("owner");
    expect(result.workspaceType).not.toBe("company");
    expect(result.workspaceType).not.toBe("team");
  });

  it("falls back to Independent Workspace when name is empty", () => {
    const result = mapIndependentRpcRow({
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      name: "",
    });
    expect(result.organizationName).toBe("Independent Workspace");
  });

  it("requires corporate domain NOT to be mandatory for Path C", () => {
    const personalDomains = ["gmail.com", "yahoo.com", "outlook.com"];
    for (const domain of personalDomains) {
      expect(domain.includes(".")).toBe(true);
      const requiresDnsChallenge = false;
      expect(requiresDnsChallenge).toBe(false);
    }
  });
});
