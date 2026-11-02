import { describe, expect, it } from "vitest";
import {
  excludeLegacyOtherOrganizations,
  isLegacyOtherOrganization,
  sortOrganizationsWithOtherLast,
} from "@/lib/auth/sort-organizations";

describe("legacy Other exclusion", () => {
  it("identifies system Other by name+slug or marker", () => {
    expect(
      isLegacyOtherOrganization({ name: "Other", slug: "other" })
    ).toBe(true);
    expect(
      isLegacyOtherOrganization({
        name: "Acme",
        slug: "acme",
        is_system_other: true,
      })
    ).toBe(true);
    expect(
      isLegacyOtherOrganization({ name: "Other", slug: "other-brokerage" })
    ).toBe(false);
  });

  it("removes system Other from join lists", () => {
    const list = excludeLegacyOtherOrganizations([
      { id: "1", name: "ABC Properties", slug: "abc" },
      { id: "2", name: "Other", slug: "other" },
      { id: "3", name: "Other Team", slug: "other-team" },
    ]);
    expect(list.map((o) => o.id)).toEqual(["1", "3"]);
  });

  it("sorts name=Other last without removing ambiguous rows", () => {
    const sorted = sortOrganizationsWithOtherLast([
      { name: "Other Desk", slug: "other-desk" },
      { name: "Acme", slug: "acme" },
      { name: "Other", slug: "other-brokerage" },
    ]);
    expect(sorted.map((o) => o.name)).toEqual([
      "Acme",
      "Other Desk",
      "Other",
    ]);
  });
});
