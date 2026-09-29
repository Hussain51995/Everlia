import type { Organization } from "@/lib/types/auth";

function isOtherOrganization(org: Pick<Organization, "name" | "slug">) {
  const slug = org.slug?.trim().toLowerCase();
  const name = org.name?.trim().toLowerCase();
  return slug === "other" || name === "other";
}

export function sortOrganizationsWithOtherLast<
  T extends Pick<Organization, "name" | "slug">,
>(organizations: T[]): T[] {
  return [...organizations].sort((a, b) => {
    const aOther = isOtherOrganization(a);
    const bOther = isOtherOrganization(b);
    if (aOther !== bOther) {
      return aOther ? 1 : -1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}
